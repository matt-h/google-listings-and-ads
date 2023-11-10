<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\GoogleListingsAndAds\Admin\Input;

defined( 'ABSPATH' ) || exit;

/**
 * Class Integer
 *
 * @package Automattic\WooCommerce\GoogleListingsAndAds\Admin\Input
 */
class Integer extends Input {
	/**
	 * Integer constructor.
	 */
	public function __construct() {
		parent::__construct( 'integer', 'woocommerce/product-number-field' );
	}
}
