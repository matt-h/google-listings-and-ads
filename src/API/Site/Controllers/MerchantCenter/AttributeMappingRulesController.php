<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\GoogleListingsAndAds\API\Site\Controllers\MerchantCenter;

use Automattic\WooCommerce\GoogleListingsAndAds\API\Site\Controllers\BaseOptionsController;
use Automattic\WooCommerce\GoogleListingsAndAds\API\TransportMethods;
use Automattic\WooCommerce\GoogleListingsAndAds\DB\Query\AttributeMappingRulesQuery;
use Automattic\WooCommerce\GoogleListingsAndAds\Product\AttributeMappingHelper;
use Automattic\WooCommerce\GoogleListingsAndAds\Proxies\RESTServer;
use Throwable;
use WP_Error;
use WP_REST_Request as Request;
use Exception;

defined( 'ABSPATH' ) || exit;

/**
 * Class for handling API requests for getting source and destination data for Attribute Mapping
 *
 * @package Automattic\WooCommerce\GoogleListingsAndAds\API\Site\Controllers\MerchantCenter
 */
class AttributeMappingRulesController extends BaseOptionsController {

	/**
	 * @var AttributeMappingRulesQuery
	 */
	private AttributeMappingRulesQuery $attribute_mapping_rules_query;

	/**
	 * @var AttributeMappingHelper
	 */
	private AttributeMappingHelper $attribute_mapping_helper;

	/**
	 * AttributeMappingController constructor.
	 *
	 * @param RESTServer                 $server
	 * @param AttributeMappingHelper     $attribute_mapping_helper
	 * @param AttributeMappingRulesQuery $attribute_mapping_rules_query
	 */
	public function __construct( RESTServer $server, AttributeMappingHelper $attribute_mapping_helper, AttributeMappingRulesQuery $attribute_mapping_rules_query ) {
		parent::__construct( $server );
		$this->attribute_mapping_helper      = $attribute_mapping_helper;
		$this->attribute_mapping_rules_query = $attribute_mapping_rules_query;
	}

	/**
	 * Register rest routes with WordPress.
	 */
	public function register_routes(): void {
		/**
		 * GET - Receive All Attribute mapping rules from database
		 */
		$this->register_route(
			'mc/mapping/rules',
			[
				[
					'methods'             => TransportMethods::READABLE,
					'callback'            => $this->get_mapping_rules_callback(),
					'permission_callback' => $this->get_permission_callback(),
				],
				[
					'methods'             => TransportMethods::CREATABLE,
					'callback'            => $this->post_mapping_create_rule_callback(),
					'permission_callback' => $this->get_permission_callback(),
					'args'                => $this->get_schema_properties(),
				],
				'schema' => $this->get_api_response_schema_callback(),
			],
		);
		/**
		 * POST - Upsert an Attribute mapping rule
		 */
		$this->register_route(
			'mc/mapping/rules/(?P<id>[\d]+)',
			[
				[
					'methods'             => TransportMethods::EDITABLE,
					'callback'            => $this->post_mapping_update_rule_callback(),
					'permission_callback' => $this->get_permission_callback(),
					'args'                => $this->get_schema_properties(),
				],
				[
					'methods'             => TransportMethods::DELETABLE,
					'callback'            => $this->delete_mapping_rule_callback(),
					'permission_callback' => $this->get_permission_callback(),
				],
				'schema' => $this->get_api_response_schema_callback(),
			],
		);
	}


	/**
	 * Callback function for getting the Attribute Mapping rules from DB
	 *
	 * @return callable
	 */
	protected function get_mapping_rules_callback(): callable {
		return function() {
			try {
				return $this->prepare_response_for_collection( $this->attribute_mapping_rules_query->get_results() );
			} catch ( Exception $e ) {
				return $this->response_from_exception( $e );
			}
		};
	}

	/**
	 * Callback function for saving an Attribute Mapping rule in DB
	 *
	 * @return callable
	 */
	protected function post_mapping_create_rule_callback(): callable {
		return function( Request $request ) {
			try {
				if ( ! $this->attribute_mapping_rules_query->insert( $this->prepare_item_for_database( $request ) ) ) {
					return $this->response_from_exception( new Exception( 'Unable to create the new rule.' ) );
				}

				return $this->attribute_mapping_rules_query->get_rule( $this->attribute_mapping_rules_query->last_insert_id() );

			} catch ( Exception $e ) {
				return $this->response_from_exception( $e );
			}
		};
	}

	/**
	 * Callback function for saving an Attribute Mapping rule in DB
	 *
	 * @return callable
	 */
	protected function post_mapping_update_rule_callback(): callable {
		return function( Request $request ) {
			try {
				$rule    = $request->get_params();
				$rule_id = $request->get_url_params()['id'];

				if ( ! $this->attribute_mapping_rules_query->update( $this->prepare_item_for_database( $request ), [ 'id' => $rule_id ] ) ) {
					return $this->response_from_exception( new Exception( 'Unable to update the new rule.' ) );
				}

				return $this->prepare_item_for_response( $this->attribute_mapping_rules_query->get_rule( $rule_id ), $request );

			} catch ( Exception $e ) {
				return $this->response_from_exception( $e );
			}
		};
	}

	/**
	 * Callback function for deleting an Attribute Mapping rule in DB
	 *
	 * @return callable
	 */
	protected function delete_mapping_rule_callback(): callable {
		return function( Request $request ) {
			try {
				$rule_id = absint( $request->get_param( 'id' ) );

				if ( ! $this->attribute_mapping_rules_query->delete( 'id', $rule_id ) ) {
					return $this->response_from_exception( new Exception( 'Unable to delete the rule' ) );
				}

				return [
					'id' => $rule_id,
				];
			} catch ( Exception $e ) {
				return $this->response_from_exception( $e );
			}
		};
	}


	/**
	 * Get the item schema properties for the controller.
	 *
	 * @return array The Schema properties
	 */
	protected function get_schema_properties(): array {
		return [
			'id'                      => [
				'description'       => __( 'The Id for the rule.', 'google-listings-and-ads' ),
				'type'              => 'integer',
				'validate_callback' => 'rest_validate_request_arg',
				'readonly'          => true,
			],
			'attribute'               => [
				'description'       => __( 'The attribute value for the rule.', 'google-listings-and-ads' ),
				'type'              => 'string',
				'validate_callback' => 'rest_validate_request_arg',
				'required'          => true,
				'enum'              => array_column( $this->attribute_mapping_helper->get_attributes(), 'id' ),
			],
			'source'                  => [
				'description'       => __( 'The source value for the rule.', 'google-listings-and-ads' ),
				'type'              => 'string',
				'validate_callback' => 'rest_validate_request_arg',
				'required'          => true,
			],
			'category_condition_type' => [
				'description'       => __( 'The category condition type to apply for this rule.', 'google-listings-and-ads' ),
				'type'              => 'string',
				'validate_callback' => 'rest_validate_request_arg',
				'required'          => true,
				'enum'              => $this->attribute_mapping_helper->get_category_condition_types(),
			],
			'categories'              => [
				'description'       => __( 'Comma separated categories for this rule.', 'google-listings-and-ads' ),
				'type'              => 'string',
				'required'          => false,
				'validate_callback' => function( $param ) {
					return $this->validate_categories_param( $param );
				},
			],
		];
	}

	/**
	 * Get the item schema name for the controller.
	 *
	 * Used for building the API response schema.
	 *
	 * @return string
	 */
	protected function get_schema_title(): string {
		return 'attribute_mapping_rules';
	}

	/**
	 * @param string $categories  Categories to validate
	 * @return bool|WP_Error  True if it's validated
	 *
	 * @throw Exception when invalid categories are provided
	 */
	public function validate_categories_param( string $categories ) {
			$categories_array = explode( ',', $categories );

		foreach ( $categories_array as $category ) {
			if ( ! is_numeric( $category ) ) {
				return new WP_Error(
					'gla_attribute_mapping_invalid_categories_schema',
					'it should be an string with categories separated by comma, and each of the categories should be in number like format',
					[
						'categories' => $categories,
					]
				);
			}
		}

			return true;
	}
}
