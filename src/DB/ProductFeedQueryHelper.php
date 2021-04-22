<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\GoogleListingsAndAds\DB;

use Automattic\WooCommerce\GoogleListingsAndAds\Infrastructure\Service;
use Automattic\WooCommerce\GoogleListingsAndAds\Internal\ContainerAwareTrait;
use Automattic\WooCommerce\GoogleListingsAndAds\Internal\Interfaces\ContainerAwareInterface;
use Automattic\WooCommerce\GoogleListingsAndAds\Product\ProductHelper;
use Automattic\WooCommerce\GoogleListingsAndAds\Product\ProductMetaHandler;
use Automattic\WooCommerce\GoogleListingsAndAds\Product\ProductRepository;
use Automattic\WooCommerce\GoogleListingsAndAds\Value\ChannelVisibility;
use Automattic\WooCommerce\GoogleListingsAndAds\Value\SyncStatus;
use WP_Query;
use WP_REST_Request;
use wpdb;

defined( 'ABSPATH' ) || exit;

/**
 * Class ProductFeedQueryHelper
 *
 * @package Automattic\WooCommerce\GoogleListingsAndAds\Product
 */
class ProductFeedQueryHelper implements Service, ContainerAwareInterface {

	use ContainerAwareTrait;

	/**
	 * @var wpdb
	 */
	protected $wpdb;

	/**
	 * @var WP_REST_Request
	 */
	protected $request;

	/**
	 * @var ProductHelper
	 */
	protected $product_helper;

	/**
	 * @var ProductMetaHandler
	 */
	protected $meta_handler;

	/**
	 * ProductFeedQueryHelper constructor.
	 *
	 * @param wpdb               $wpdb
	 * @param ProductHelper      $product_helper
	 * @param ProductMetaHandler $meta_handler
	 */
	public function __construct( wpdb $wpdb, ProductHelper $product_helper, ProductMetaHandler $meta_handler ) {
		$this->wpdb           = $wpdb;
		$this->product_helper = $product_helper;
		$this->meta_handler   = $meta_handler;
	}

	/**
	 * @param WP_REST_Request $request
	 *
	 * @return array
	 */
	public function get( WP_REST_Request $request ) {
		$this->request = $request;
		$products      = [];
		$args          = $this->prepare_query_args();

		list( $limit, $offset ) = $this->prepare_query_pagination();

		add_filter( 'posts_where', [ $this, 'title_filter' ], 10, 2 );
		add_filter( 'posts_orderby', [ $this, 'orderby_filter' ], 10, 2 );

		foreach ( $this->container->get( ProductRepository::class )->find( $args, $limit, $offset ) as $product ) {
			$id              = $product->get_id();
			$products[ $id ] = [
				'id'      => $id,
				'title'   => $product->get_name(),
				'visible' => $this->product_helper->get_visibility( $product ) !== ChannelVisibility::DONT_SYNC_AND_SHOW,
				'status'  => $this->product_helper->get_sync_status( $product ),
				'errors'  => $this->meta_handler->get_errors( $id ),
			];
		}

		remove_filter( 'posts_where', [ $this, 'title_filter' ] );
		remove_filter( 'posts_orderby', [ $this, 'orderby_filter' ] );

		return array_values( $products );
	}

	/**
	 * Prepare the args to be used to retrieve the products, namely orderby, meta_query and type.
	 *
	 * @return array
	 */
	protected function prepare_query_args(): array {
		$orderby    = [ 'title' => 'ASC' ];
		$meta_query = [];

		if ( ! empty( $this->request['orderby'] ) ) {
			$request_orderby = $this->request['orderby'];
			$order           = $this->get_order();

			if ( $request_orderby === 'title' || $request_orderby === 'name' ) {
				$orderby['title'] = $order;
			} elseif ( $request_orderby === 'id' || $request_orderby === 'ID' ) {
				$orderby = [ 'ID' => $order ] + $orderby;
			} elseif ( $request_orderby === 'visible' ) {
				$meta_query = [
					'relation'            => 'OR',
					'visibility_clause'   => [
						'key'   => ProductMetaHandler::KEY_VISIBILITY,
						'value' => 'sync-and-show',
					],
					'visibility_clause_2' => [
						'key'     => ProductMetaHandler::KEY_VISIBILITY,
						'compare' => 'NOT EXISTS',
					],
					'visibility_clause_3' => [
						'key'   => ProductMetaHandler::KEY_VISIBILITY,
						'value' => 'dont-sync-and-show',
					],
				];
				// Orderby treated in orderby_filter
			} elseif ( $request_orderby === 'status' ) {
				$meta_query = [
					'relation'        => 'OR',
					'synced_clause'   => [
						'key'     => ProductMetaHandler::KEY_SYNC_STATUS,
						'compare' => 'EXISTS',
					],
					'synced_clause_2' => [
						'key'     => ProductMetaHandler::KEY_SYNC_STATUS,
						'compare' => 'NOT EXISTS',
					],
				];
				// Orderby treated in orderby_filter
			}
		}

		return [
			'type'       => [ 'simple', 'variable' ],
			'orderby'    => $orderby,
			'meta_query' => $meta_query,
		];
	}

	/**
	 * Convert the per_page and page parameters into limit and offset values.
	 *
	 * @return array Containing limit and offset values.
	 */
	protected function prepare_query_pagination(): array {
		$limit  = -1;
		$offset = 0;

		if ( ! empty( $this->request['per_page'] ) ) {
			$limit  = intval( $this->request['per_page'] );
			$page   = max( 1, intval( $this->request['page'] ) );
			$offset = $limit * ( $page - 1 );
		}
		return [ $limit, $offset ];
	}

	/**
	 * Used for the posts_where hook, filters the WHERE clause of the query by
	 * searching for the 'query' parameter in the product titles (when the parameter is present).
	 *
	 * @param string   $where The WHERE clause of the query.
	 * @param WP_Query $wp_query The WP_Query instance (passed by reference).
	 *
	 * @return string The updated WHERE clause.
	 */
	public function title_filter( string $where, WP_Query $wp_query ): string {
		if ( ! empty( $this->request['query'] ) ) {
			$title_search = '%' . $this->wpdb->esc_like( $this->request['query'] ) . '%';
			$where       .= $this->wpdb->prepare( " AND `{$this->wpdb->posts}`.`post_title` LIKE %s", $title_search ); // phpcs:ignore WordPress.DB.PreparedSQL
		}
		return $where;
	}

	/**
	 * Used for the posts_where hook, modifies the ORDER BY clause of the query to
	 * order the results by visibility or sync status.
	 *
	 * @param string   $orderby The ORDER BY clause of the query.
	 * @param WP_Query $wp_query   The WP_Query instance (passed by reference).
	 *
	 * @return string The updated ORDER BY clause.
	 */
	public function orderby_filter( string $orderby, WP_Query $wp_query ): string {
		$order = $this->get_order();
		switch ( $this->request['orderby'] ) {
			case 'visible':
				$new_order = "`{$this->wpdb->postmeta}`.`meta_value` = %s $order, ";
				$orderby   = $this->wpdb->prepare( $new_order, ChannelVisibility::DONT_SYNC_AND_SHOW ) . $orderby; // phpcs:ignore WordPress.DB.PreparedSQL
				break;
			case 'status':
				$placeholders = implode( ',', array_fill( 0, count( SyncStatus::ALLOWED_VALUES ), '%s' ) );
				$new_order    = "FIELD( `{$this->wpdb->postmeta}`.`meta_value`, $placeholders ) $order, ";
				$orderby      = $this->wpdb->prepare( $new_order, SyncStatus::ALLOWED_VALUES ) . $orderby; // phpcs:ignore WordPress.DB.PreparedSQL
				break;
		}
		return $orderby;
	}

	/**
	 * Return the ORDER BY order based on the order request parameter value.
	 *
	 * @return string
	 */
	protected function get_order(): string {
		return strtoupper( $this->request['order'] ?? '' ) === 'DESC' ? 'DESC' : 'ASC';
	}
}

