<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\GoogleListingsAndAds\Internal\DependencyManagement;

use Automattic\WooCommerce\GoogleListingsAndAds\Exception\ValidateInterface;
use Automattic\WooCommerce\GoogleListingsAndAds\Infrastructure\Service;
use Automattic\WooCommerce\GoogleListingsAndAds\Integration\IntegrationInitializer;
use Automattic\WooCommerce\GoogleListingsAndAds\Integration\IntegrationInterface;
use Automattic\WooCommerce\GoogleListingsAndAds\Integration\WooCommerceBrands;
use Automattic\WooCommerce\GoogleListingsAndAds\Integration\YoastWooCommerceSeo;
use Automattic\WooCommerce\GoogleListingsAndAds\Proxies\WP;

defined( 'ABSPATH' ) || exit;

/**
 * Class IntegrationServiceProvider
 *
 * Provides the integration classes and their related services to the container.
 *
 * @package Automattic\WooCommerce\GoogleListingsAndAds\Internal\DependencyManagement
 */
class IntegrationServiceProvider extends AbstractServiceProvider {

	use ValidateInterface;

	/**
	 * @var array
	 */
	protected $provides = [
		Service::class                => true,
		IntegrationInterface::class   => true,
		IntegrationInitializer::class => true,
	];

	/**
	 * @return void
	 */
	public function register(): void {
		$this->share_with_tags( YoastWooCommerceSeo::class );
		$this->share_with_tags( WooCommerceBrands::class, WP::class );

		$this->share_with_tags(
			IntegrationInitializer::class,
			IntegrationInterface::class
		);
	}
}
