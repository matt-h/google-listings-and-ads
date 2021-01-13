/**
 * External dependencies
 */
import { RadioControl } from '@wordpress/components';

/**
 * Internal dependencies
 */
import './index.scss';

const AppRadioContentControl = ( props ) => {
	const { className = '', label, value, selected, children, ...rest } = props;

	return (
		<div className={ `app-radio-content-control ${ className }` }>
			<RadioControl
				selected={ selected }
				options={ [
					{
						label,
						value,
					},
				] }
				{ ...rest }
			/>
			{ selected === value && (
				<div className="app-radio-content-control__content">
					{ children }
				</div>
			) }
		</div>
	);
};

export default AppRadioContentControl;