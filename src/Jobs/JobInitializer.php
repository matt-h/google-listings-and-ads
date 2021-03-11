<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\GoogleListingsAndAds\Jobs;

use Automattic\WooCommerce\GoogleListingsAndAds\ActionScheduler\ActionSchedulerInterface;
use Automattic\WooCommerce\GoogleListingsAndAds\Exception\ValidateInterface;
use Automattic\WooCommerce\GoogleListingsAndAds\Infrastructure\Conditional;
use Automattic\WooCommerce\GoogleListingsAndAds\Infrastructure\Registerable;
use DateTime;

defined( 'ABSPATH' ) || exit;

/**
 * Class JobInitializer
 *
 * Initializes all jobs when certain conditions are met (e.g. the request is async or initiated by CRON, CLI, etc.).
 *
 * The list of jobs (classes implementing JobInterface) are pulled from the container.
 *
 * @package Automattic\WooCommerce\GoogleListingsAndAds\Jobs
 */
class JobInitializer implements Registerable, Conditional {

	use ValidateInterface;

	/**
	 * @var JobInterface[]
	 */
	protected $jobs;

	/**
	 * @var ActionSchedulerInterface
	 */
	protected $action_scheduler;

	/**
	 * JobInitializer constructor.
	 *
	 * @param JobInterface[]           $jobs
	 * @param ActionSchedulerInterface $action_scheduler
	 */
	public function __construct( array $jobs, ActionSchedulerInterface $action_scheduler ) {
		foreach ( $jobs as $job ) {
			$this->validate_instanceof( $job, JobInterface::class );
		}

		$this->jobs             = $jobs;
		$this->action_scheduler = $action_scheduler;
	}

	/**
	 * Initialize all jobs.
	 */
	public function register(): void {
		foreach ( $this->jobs as $job ) {
			$job->init();

			if ( $job instanceof StartOnHookInterface ) {
				add_action( $job->get_start_hook(), [ $job, 'start' ], 10, 0 );
			}

			if ( $job instanceof RecurringJobInterface &&
				 ! $this->action_scheduler->has_scheduled_action( $job->get_start_hook() ) &&
				 $job->can_start() ) {

				$recurring_date_time = new DateTime( 'tomorrow 3am', wp_timezone() );
				$schedule            = '0 3 * * *'; // 3 am every day
				$this->action_scheduler->schedule_cron( $recurring_date_time->getTimestamp(), $schedule, $job->get_start_hook() );
			}
		}
	}

	/**
	 * Check whether this object is currently needed.
	 *
	 * @return bool Whether the object is needed.
	 */
	public static function is_needed(): bool {
		return ( defined( 'DOING_AJAX' ) || defined( 'DOING_CRON' ) || ( defined( 'WP_CLI' ) && WP_CLI ) || is_admin() );
	}
}