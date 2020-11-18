<?php
declare( strict_types=1 );

namespace Automattic\WooCommerce\GoogleListingsAndAds\Internal\DependencyManagement;

use Automattic\WooCommerce\GoogleListingsAndAds\Vendor\League\Container\Definition\DefinitionInterface;
use Automattic\WooCommerce\GoogleListingsAndAds\Vendor\League\Container\ServiceProvider\AbstractServiceProvider as LeagueProvider;

/**
 * Class AbstractServiceProvider
 *
 * @package Automattic\WooCommerce\GoogleListingsAndAds\Internal\DependencyManagement
 */
abstract class AbstractServiceProvider extends LeagueProvider {

	/**
	 * Array of classes provided by this container.
	 *
	 * @var array
	 */
	protected $provides = [];

	/**
	 * Returns a boolean if checking whether this provider provides a specific
	 * service or returns an array of provided services if no argument passed.
	 *
	 * @param string $service
	 *
	 * @return boolean
	 */
	public function provides( string $service ): bool {
		return array_key_exists( $service, $this->provides );
	}

	/**
	 * Add an interface to the container.
	 *
	 * @param string      $interface The interface to add.
	 * @param string|null $concrete  (Optional) The concrete class.
	 *
	 * @return DefinitionInterface
	 */
	protected function share_interface( string $interface, $concrete = null ): DefinitionInterface {
		return $this->getLeagueContainer()->share( $interface, $concrete );
	}

	/**
	 * Share a class and add interfaces as tags.
	 *
	 * @param string $class        The class name to add.
	 * @param mixed  ...$arguments Constructor arguments for the class.
	 *
	 * @return DefinitionInterface
	 */
	protected function share_with_tags( string $class, ...$arguments ): DefinitionInterface {
		$definition = $this->share( $class, ...$arguments );
		foreach ( class_implements( $class ) as $interface ) {
			$definition->addTag( $interface );
		}

		return $definition;
	}

	/**
	 * Share a class.
	 *
	 * @param string $class        The class name to add.
	 * @param mixed  ...$arguments Constructor arguments for the class.
	 *
	 * @return DefinitionInterface
	 */
	protected function share( string $class, ...$arguments ): DefinitionInterface {
		return $this->getLeagueContainer()->share( $class )->addArguments( $arguments );
	}
}
