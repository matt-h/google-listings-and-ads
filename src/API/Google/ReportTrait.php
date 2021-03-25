<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\GoogleListingsAndAds\API\Google;

/**
 * Trait ReportTrait
 *
 * @package Automattic\WooCommerce\GoogleListingsAndAds\API\Google
 */
trait ReportTrait {

	/** @var array $report_data */
	private $report_data = [];

	/**
	 * Increase report data by adding the subtotals.
	 *
	 * @param string $field Field to increase.
	 * @param string $index Unique index.
	 * @param array  $data  Report data.
	 */
	protected function increase_report_data( string $field, string $index, array $data ) {
		if ( ! isset( $this->report_data[ $field ][ $index ] ) ) {
			$this->report_data[ $field ][ $index ] = $data;
		} elseif ( ! empty( $data['subtotals'] ) ) {
			foreach ( $data['subtotals'] as $name => $subtotal ) {
				$this->report_data[ $field ][ $index ]['subtotals'][ $name ] += $subtotal;
			}
		}
	}

	/**
	 * Increase report totals.
	 *
	 * @param array $data Totals data.
	 */
	protected function increase_report_totals( array $data ) {
		foreach ( $data as $name => $total ) {
			if ( ! isset( $this->report_data['totals'][ $name ] ) ) {
				$this->report_data['totals'][ $name ] = $total;
			} else {
				$this->report_data['totals'][ $name ] += $total;
			}
		}
	}
}
