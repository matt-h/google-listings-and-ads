/**
 * External dependencies
 */
import { useEffect } from '@wordpress/element';
import { getHistory } from '@woocommerce/navigation';
import { noop } from 'lodash';

const alwaysTrue = () => true;

/**
 * Returns a normalized location to handle the inconsistent pathname between history v5 (≥ WC 6.7) and v4 (< WC 6.7).
 *
 * Since WC calls `history.push()` with a path that starts with 'admin.php?...', it brings
 * the inconsistent `location` results.
 *
 * The `pathname` in v5 may be 'admin.php' or '/wp-admin/admin.php'.
 *
 * @see https://github.com/remix-run/history/blob/v5.3.0/packages/history/index.ts#L735
 * @see https://github.com/remix-run/history/blob/v5.3.0/packages/history/index.ts#L701
 * @see https://github.com/remix-run/history/blob/v5.3.0/packages/history/index.ts#L1086
 *
 * The `pathname` in v4 is always '/admin.php'.
 *
 * @see https://github.com/remix-run/history/blob/v4/modules/createBrowserHistory.js#L166
 * @see https://github.com/remix-run/history/blob/v4/modules/LocationUtils.js#L57-L61
 *
 * @param {Object} location Location object to be normalized.
 * @return {Object} Normalized location object.
 */
function normalizeLocation( location ) {
	return {
		...location,
		pathname: location.pathname.replace( /^(\/wp-admin)?\//, '' ),
	};
}

/**
 * Show prompt when the user tries to unload/leave the page.
 * Adds and removed `beforeunload` event listener according to the given flag.
 *
 * @param {string} message Message to be shown. Note, some browsers may not support this when unloading the page.
 * @param {boolean} shouldBlock Boolean flag, whether the prompt should be shown.
 * @param {( location: Object ) => boolean} [blockedLocation] Function to filter specific locations for blocking when navigating using woocommerce/navigation.
 */
export default function useNavigateAwayPromptEffect(
	message,
	shouldBlock,
	blockedLocation = alwaysTrue
) {
	// history#v5 compatibility: As one of useEffect deps for triggering a new blocking after history is changed.
	const { key } = getHistory().location;

	useEffect( () => {
		/**
		 * Bind beforeunload event for non `woocommerce/navigation` links and reloads.
		 * history#v5 does bind `beforeunload` automatically, with v4 we need to do it ourselves.
		 *
		 * @param {Event} e Before Unload Event
		 */
		const eventListener = ( e ) => {
			// If you prevent default behavior in Mozilla Firefox prompt will always be shown.
			e.preventDefault();
			// Chrome requires returnValue to be set.
			e.returnValue = message;
		};

		let unblock = noop;

		if ( shouldBlock ) {
			// Block navigation in order to show a confirmation prompt.
			unblock = getHistory().block( ( transition ) => {
				// In history v4 (< WC 6.7) block method receives two parameter (the location and action).
				// In v5 (>= WC 6.7) it has only one parameter that is a transition object with location, retry and action properties.
				const { location = transition, retry = noop } = transition;
				let shouldUnblock = true;

				if ( blockedLocation( normalizeLocation( location ) ) ) {
					// Show prompt to confirm if the user wants to navigate away
					shouldUnblock = window.confirm( message ); // eslint-disable-line no-alert
				}

				// v5 compatibility requires the calls to unblock and retry functions.
				if ( shouldUnblock ) {
					unblock();
					retry();
				}

				// v4 compatibility requires a return boolean to tell whether actually to unblock the navigation.
				return shouldUnblock;
			} );

			window.addEventListener( 'beforeunload', eventListener );
		}

		return () => {
			unblock();
			window.removeEventListener( 'beforeunload', eventListener );
		};
	}, [ key, message, shouldBlock, blockedLocation ] );
}
