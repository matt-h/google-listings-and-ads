/**
 * External dependencies
 */
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Form } from '@woocommerce/components';
import { noop } from 'lodash';

/**
 * Internal dependencies
 */
import AppModal from '.~/components/app-modal';
import AppInputPriceControl from '.~/components/app-input-price-control';
import VerticalGapLayout from '.~/components/vertical-gap-layout';
import AppCountrySelect from '.~/components/app-country-select';
import validateMinimumOrder from './validateMinimumOrder';

/**
 * @typedef { import("./typedefs.js").MinimumOrderGroup } MinimumOrderGroup
 */

/**
 * Display the edit minimum order modal that is wrapped in a Form.
 *
 * When users submit the form, `props.onRequestClose` will be called first, and then followed by `props.onSubmit`.
 * If we were to call `props.onSubmit` first, it may cause some state change in the parent component and causing this component not to be rendered,
 * and when `props.onRequestClose` is called later, there would be a runtime React error because the component is no longer there.
 *
 * @param {Object} props Props.
 * @param {Array<string>} props.countryOptions Array of country codes options, to be used as options in AppCountrySelect.
 * @param {MinimumOrderGroup} props.initialValues Initial values for the form.
 * @param {function()} props.onRequestClose Callback to close the modal.
 * @param {function(Object)} props.onSubmit Callback when the form is submitted, with the form value.
 */
const EditMinimumOrderFormModal = ( {
	countryOptions,
	initialValues,
	onRequestClose = noop,
	onSubmit = noop,
} ) => {
	const handleDeleteClick = () => {
		onRequestClose();
		onSubmit( {
			countries: [],
			currency: undefined,
			threshold: undefined,
		} );
	};

	const handleSubmitCallback = ( newValue ) => {
		onRequestClose();
		onSubmit( newValue );
	};

	return (
		<Form
			initialValues={ initialValues }
			validate={ validateMinimumOrder }
			onSubmit={ handleSubmitCallback }
		>
			{ ( formProps ) => {
				const {
					getInputProps,
					values,
					setValue,
					isValidForm,
					handleSubmit,
				} = formProps;

				return (
					<AppModal
						title={ __(
							'Minimum order to qualify for free shipping',
							'google-listings-and-ads'
						) }
						buttons={ [
							<Button
								key="delete"
								isTertiary
								isDestructive
								onClick={ handleDeleteClick }
							>
								{ __( 'Delete', 'google-listings-and-ads' ) }
							</Button>,
							<Button
								key="save"
								isPrimary
								disabled={ ! isValidForm }
								onClick={ handleSubmit }
							>
								{ __(
									'Update minimum order',
									'google-listings-and-ads'
								) }
							</Button>,
						] }
						onRequestClose={ onRequestClose }
					>
						<VerticalGapLayout>
							<AppCountrySelect
								label={ __(
									'If customer is in',
									'google-listings-and-ads'
								) }
								options={ countryOptions }
								multiple
								{ ...getInputProps( 'countries' ) }
							/>
							<AppInputPriceControl
								label={ __(
									'Then they qualify for free shipping if their order is over',
									'google-listings-and-ads'
								) }
								suffix={ values.currency }
								{ ...getInputProps( 'threshold' ) }
								onBlur={ ( event, numberValue ) => {
									getInputProps( 'threshold' ).onBlur(
										event
									);
									setValue(
										'threshold',
										numberValue > 0
											? numberValue
											: undefined
									);
								} }
							/>
						</VerticalGapLayout>
					</AppModal>
				);
			} }
		</Form>
	);
};

export default EditMinimumOrderFormModal;
