/**
 * External dependencies
 */
import { Stepper } from '@woocommerce/components';
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { recordEvent } from '@woocommerce/tracks';

/**
 * Internal dependencies
 */
import SetupAccounts from './setup-accounts';
import AdsCampaign from '.~/components/paid-ads/ads-campaign';
import SetupBilling from './setup-billing';

/**
 * @param {Object} props React props
 * @param {Object} props.formProps Form props forwarded from `Form` component.
 * @fires gla_setup_ads with `{ triggered_by: 'step1-continue-button' | 'step2-continue-button' , action: 'go-to-step2' | 'go-to-step3' }`.
 * @fires gla_setup_ads with `{ triggered_by: 'stepper-button', action: 'go-to-step1' | 'go-to-step2' }`.
 */
const AdsStepper = ( { formProps } ) => {
	const [ step, setStep ] = useState( '1' );

	// Allow the users to go backward only, not forward.
	// Users can only go forward by clicking on the Continue button.
	const handleStepClick = ( value ) => {
		if ( value < step ) {
			recordEvent( 'gla_setup_ads', {
				triggered_by: 'stepper-button',
				action: `go-to-step${ value }`,
			} );
			setStep( value );
		}
	};

	/**
	 * Handles "onContinue" callback to set the current step and record event tracking.
	 *
	 * @param {string} to The next step to go to.
	 */
	const continueStep = ( to ) => {
		const from = step;

		recordEvent( 'gla_setup_ads', {
			triggered_by: `step${ from }-continue-button`,
			action: `go-to-step${ to }`,
		} );
		setStep( to );
	};

	const handleSetupAccountsContinue = () => {
		continueStep( '2' );
	};

	const handleCreateCampaignContinue = () => {
		continueStep( '3' );
	};

	return (
		// This Stepper with this class name
		// should be refactored into separate shared component.
		// It is also used in the Setup MC flow.
		<Stepper
			className="gla-setup-stepper"
			currentStep={ step }
			steps={ [
				{
					key: '1',
					label: __(
						'Set up your accounts',
						'google-listings-and-ads'
					),
					content: (
						<SetupAccounts
							onContinue={ handleSetupAccountsContinue }
						/>
					),
					onClick: handleStepClick,
				},
				{
					key: '2',
					label: __(
						'Create your paid campaign',
						'google-listings-and-ads'
					),
					content: (
						<AdsCampaign
							trackingContext="setup-ads"
							onContinue={ handleCreateCampaignContinue }
						/>
					),
					onClick: handleStepClick,
				},
				{
					key: '3',
					label: __( 'Set up billing', 'google-listings-and-ads' ),
					content: <SetupBilling formProps={ formProps } />,
					onClick: handleStepClick,
				},
			] }
		/>
	);
};

export default AdsStepper;
