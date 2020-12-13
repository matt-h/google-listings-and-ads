/**
 * External dependencies
 */
import { Button } from '@wordpress/components';

/**
 * Internal dependencies
 */
import './index.scss';

const AppIconButton = ( props ) => {
	const { icon, text, className = '' } = props;

	return (
		<Button className={ `app-icon-button ${ className }` }>
			<div>{ icon }</div>
			{ text }
		</Button>
	);
};

export default AppIconButton;
