/**
 * External dependencies
 */
const { test, expect } = require( '@playwright/test' );

/**
 * Internal dependencies
 */
import SetupBudgetPage from '../../utils/pages/setup-ads/setup-budget';
import CompleteCampaign from '../../utils/pages/setup-mc/step-4-complete-campaign';
import SetupAdsAccountPage from '../../utils/pages/setup-ads/setup-ads-accounts';
import {
	checkFAQExpandable,
	fillCountryInSearchBox,
	getCountryInputSearchBoxContainer,
	getCountryTagsFromInputSearchBoxContainer,
	getFAQPanelTitle,
	getFAQPanelRow,
	getTreeSelectMenu,
	removeCountryFromSearchBox,
} from '../../utils/page';

test.use( { storageState: process.env.ADMINSTATE } );

test.describe.configure( { mode: 'serial' } );

/**
 * @type {import('../../utils/pages/setup-ads/setup-budget.js').default} setupBudgetPage
 */
let setupBudgetPage = null;

/**
 * @type {import('../../utils/pages/setup-mc/step-4-complete-campaign.js').default} completeCampaign
 */
let completeCampaign = null;

/**
 * @type {import('../../utils/pages/setup-ads/setup-ads-accounts.js').default} setupAdsAccountPage
 */
let setupAdsAccountPage = null;

/**
 * @type {import('@playwright/test').Page} page
 */
let page = null;

test.describe( 'Complete your campaign', () => {
	test.beforeAll( async ( { browser } ) => {
		page = await browser.newPage();
		setupBudgetPage = new SetupBudgetPage( page );
		completeCampaign = new CompleteCampaign( page );
		setupAdsAccountPage = new SetupAdsAccountPage( page );
		await Promise.all( [
			// Mock Jetpack as connected
			completeCampaign.mockJetpackConnected(),

			// Mock google as connected.
			completeCampaign.mockGoogleConnected(),

			// Mock Merchant Center as connected
			completeCampaign.mockMCConnected(),

			// Mock MC step as paid_ads
			completeCampaign.mockMCSetup( 'incomplete', 'paid_ads' ),

			// Mock MC target audience, only mocks GET method
			completeCampaign.fulfillTargetAudience(
				{
					location: 'selected',
					countries: [ 'US', 'TW', 'GB' ],
					locale: 'en_US',
					language: 'English',
				},
				[ 'GET' ]
			),

			// Mock syncable products count
			completeCampaign.fulfillSyncableProductsCountRequest( {
				count: 1024,
			} ),
		] );

		await completeCampaign.goto();
	} );

	test.afterAll( async () => {
		await completeCampaign.closePage();
	} );

	test( 'should see the heading and the texts below', async () => {
		await expect(
			page.getByRole( 'heading', {
				name: 'Complete your campaign with paid ads',
			} )
		).toBeVisible();

		await expect(
			page.getByText(
				'As soon as your products are approved, your listings and ads will be live. In the meantime, let’s set up your ads.'
			)
		).toBeVisible();
	} );

	test.describe( 'Product feed status', () => {
		test( 'should see the correct syncable products count', async () => {
			const syncableProductCountTooltip =
				completeCampaign.getSyncableProductsCountTooltip();
			await expect( syncableProductCountTooltip ).toContainText( '1024' );
		} );
	} );

	test.describe( 'FAQ panels', () => {
		test( 'should see five questions in FAQ', async () => {
			const faqTitles = getFAQPanelTitle( page );
			await expect( faqTitles ).toHaveCount( 5 );
		} );

		test( 'should not see FAQ rows when FAQ titles are not clicked', async () => {
			const faqRows = getFAQPanelRow( page );
			await expect( faqRows ).toHaveCount( 0 );
		} );

		// eslint-disable-next-line jest/expect-expect
		test( 'should see FAQ rows when all FAQ titles are clicked', async () => {
			await checkFAQExpandable( page );
		} );
	} );

	test.describe( 'Click "Skip this step for now"', () => {
		test.beforeAll( async () => {
			await Promise.all( [
				// Mock settings sync request
				completeCampaign.mockSuccessfulSettingsSyncRequest(),

				// Mock product statistics request
				completeCampaign.fulfillProductStatisticsRequest( {
					timestamp: 1695011644,
					statistics: {
						active: 0,
						expiring: 0,
						pending: 0,
						disapproved: 0,
						not_synced: 1137,
					},
					scheduled_sync: 1,
				} ),
			] );
			await completeCampaign.clickSkipStepButton();
		} );

		test( 'should see the setup success modal', async () => {
			const setupSuccessModal = page
				.locator( '.components-modal__content' )
				.filter( {
					hasText:
						'You’ve successfully set up Google Listings & Ads!',
				} );
			await expect( setupSuccessModal ).toBeVisible();
		} );

		test( 'should see the url contains product-feed', async () => {
			expect( page.url() ).toMatch( /path=%2Fgoogle%2Fproduct-feed/ );
		} );
	} );

	test.describe( 'Set up paid ads', () => {
		test.beforeAll( async () => {
			await Promise.all( [
				// Mock settings sync request
				completeCampaign.mockSuccessfulSettingsSyncRequest(),

				// Mock product statistics request
				completeCampaign.fulfillProductStatisticsRequest( {
					timestamp: 1695011644,
					statistics: {
						active: 0,
						expiring: 0,
						pending: 0,
						disapproved: 0,
						not_synced: 1137,
					},
					scheduled_sync: 1,
				} ),
			] );
			await completeCampaign.goto();
		} );

		test( 'should see the "Create a paid ad campaign" button is enabled', async () => {
			const button = completeCampaign.getCreatePaidAdButton();
			await expect( button ).toBeVisible();
			await expect( button ).toBeEnabled();
		} );

		test.describe( 'Click "Create a paid ad campaign" button', () => {
			test.beforeAll( async () => {
				await completeCampaign.clickCreatePaidAdButton();
				await setupAdsAccountPage.mockAdsAccountsResponse( [] );
			} );

			test( 'should see "Complete setup" button is disabled', async () => {
				const completeSetupButton =
					completeCampaign.getCompleteSetupButton();
				await expect( completeSetupButton ).toBeVisible();
				await expect( completeSetupButton ).toBeDisabled();
			} );

			test( 'should see "Skip paid ads creation" button is enabled', async () => {
				const skipPaidAdsCreationButton =
					completeCampaign.getSkipPaidAdsCreationButton();
				await expect( skipPaidAdsCreationButton ).toBeVisible();
				await expect( skipPaidAdsCreationButton ).toBeEnabled();
			} );

			test( 'should see "Google Ads" section is enabled', async () => {
				const googleAdsSection =
					completeCampaign.getAdsAccountSection();
				await expect( googleAdsSection ).toBeVisible();

				// Cannot use toBeEnabled() because <section> is not a native control element
				// such as <button> or <input> so it will be always enabled.
				await expect( googleAdsSection ).not.toHaveClass(
					/wcdl-section--is-disabled/
				);
			} );

			test( 'should see "Ads audience" section is disabled', async () => {
				const adsAudienceSection =
					completeCampaign.getAdsAudienceSection();
				await expect( adsAudienceSection ).toBeVisible();

				// Cannot use toBeDisabled() because <section> is not a native control element
				// such as <button> or <input> so it will be always enabled.
				await expect( adsAudienceSection ).toHaveClass(
					/wcdl-section--is-disabled/
				);
			} );

			test( 'should see "Set your budget" section is disabled', async () => {
				const budgetSection = completeCampaign.getBudgetSection();
				await expect( budgetSection ).toBeVisible();

				// Cannot use toBeDisabled() because <section> is not a native control element
				// such as <button> or <input> so it will be always enabled.
				await expect( budgetSection ).toHaveClass(
					/wcdl-section--is-disabled/
				);
			} );

			test.describe( 'Create account', () => {
				test.beforeAll( async () => {
					await completeCampaign.clickCreateAccountButton();
				} );

				test( 'should see "Create Google Ads Account" modal', async () => {
					const modal = setupAdsAccountPage.getCreateAccountModal();
					await expect( modal ).toBeVisible();
				} );

				test( 'should see "ToS checkbox" from modal is unchecked', async () => {
					const checkbox =
						setupAdsAccountPage.getAcceptTermCreateAccount();
					await expect( checkbox ).toBeVisible();
					await expect( checkbox ).not.toBeChecked();
				} );

				test( 'should see "Create account" from modal is disabled', async () => {
					const button =
						setupAdsAccountPage.getCreateAdsAccountButtonModal();
					await expect( button ).toBeVisible();
					await expect( button ).toBeDisabled();
				} );

				test( 'should see "Create account" from modal is enabled when ToS checkbox is checked', async () => {
					const button =
						setupAdsAccountPage.getCreateAdsAccountButtonModal();
					await setupAdsAccountPage.clickToSCheckboxFromModal();
					await expect( button ).toBeEnabled();
				} );

				test( 'should see ads account connected after creating a new ads account', async () => {
					await setupAdsAccountPage.mockAdsAccountsResponse( [
						{
							id: 12345,
							name: 'Test Ad',
						},
					] );

					await setupAdsAccountPage.fulfillAdsConnection( {
						id: 12345,
						currency: 'TWD',
						symbol: 'NT$',
						status: 'connected',
					} );

					await setupAdsAccountPage.clickCreateAccountButtonFromModal();
					const connectedText =
						completeCampaign.getAdsAccountConnectedText();
					await expect( connectedText ).toBeVisible();
				} );
			} );

			test.describe( 'Connect to an existing account', () => {
				test.beforeAll( async () => {
					await setupAdsAccountPage.mockAdsAccountsResponse( [
						{
							id: 12345,
							name: 'Test Ad 1',
						},
						{
							id: 23456,
							name: 'Test Ad 2',
						},
					] );

					await setupAdsAccountPage.fulfillAdsConnection( {
						id: 12345,
						currency: 'TWD',
						symbol: 'NT$',
						status: 'disconnected',
					} );

					await setupAdsAccountPage.clickConnectDifferentAccountButton();
				} );

				test( 'should see the ads account select', async () => {
					const select = setupAdsAccountPage.getAdsAccountSelect();
					await expect( select ).toBeVisible();
				} );

				test( 'should see connect button is disabled when no ads account is selected', async () => {
					const button = setupAdsAccountPage.getConnectAdsButton();
					await expect( button ).toBeVisible();
					await expect( button ).toBeDisabled();
				} );

				test( 'should see connect button is enabled when an ads account is selected', async () => {
					await setupAdsAccountPage.selectAnExistingAdsAccount(
						'23456'
					);
					const button = setupAdsAccountPage.getConnectAdsButton();
					await expect( button ).toBeVisible();
					await expect( button ).toBeEnabled();
				} );

				test( 'should see ads account connected text, audience and budget sections are enabled, and ads/accounts request is triggered after clicking connect button', async () => {
					await setupAdsAccountPage.mockAdsAccountsResponse( [
						{
							id: 23456,
							name: 'Test Ad 2',
						},
					] );

					await setupAdsAccountPage.fulfillAdsConnection( {
						id: 23456,
						currency: 'TWD',
						symbol: 'NT$',
						status: 'connected',
					} );

					const requestPromise =
						setupAdsAccountPage.registerConnectAdsAccountRequests(
							'23456'
						);

					await setupAdsAccountPage.clickConnectAds();

					await requestPromise;

					const connectedText =
						completeCampaign.getAdsAccountConnectedText();
					await expect( connectedText ).toBeVisible();

					const adsAudienceSection =
						completeCampaign.getAdsAudienceSection();
					const budgetSection = completeCampaign.getBudgetSection();

					// Cannot use toBeDisabled() because <section> is not a native control element
					// such as <button> or <input> so it will be always enabled.
					await expect( adsAudienceSection ).not.toHaveClass(
						/wcdl-section--is-disabled/
					);
					await expect( budgetSection ).not.toHaveClass(
						/wcdl-section--is-disabled/
					);
				} );
			} );

			test.describe( 'Select audience', () => {
				test( 'should see only three country tags in country input search box', async () => {
					const countrySearchBoxContainer =
						getCountryInputSearchBoxContainer( page );
					const countryTags =
						getCountryTagsFromInputSearchBoxContainer( page );
					await expect( countryTags ).toHaveCount( 3 );
					await expect( countrySearchBoxContainer ).toContainText(
						'United States'
					);
					await expect( countrySearchBoxContainer ).toContainText(
						'Taiwan'
					);
					await expect( countrySearchBoxContainer ).toContainText(
						'United Kingdom'
					);
				} );

				test( 'should only allow searching for the same set of the countries selected in step 2, which is returned by target audience API', async () => {
					const treeSelectMenu = getTreeSelectMenu( page );

					await fillCountryInSearchBox( page, 'United States' );
					await expect( treeSelectMenu ).toBeVisible();

					await fillCountryInSearchBox( page, 'United Kingdom' );
					await expect( treeSelectMenu ).toBeVisible();

					await fillCountryInSearchBox( page, 'Taiwan' );
					await expect( treeSelectMenu ).toBeVisible();

					await fillCountryInSearchBox( page, 'Japan' );
					await expect( treeSelectMenu ).not.toBeVisible();

					await fillCountryInSearchBox( page, 'Spain' );
					await expect( treeSelectMenu ).not.toBeVisible();
				} );

				test( 'should see the budget recommendation range changed, and see the budget recommendation request is triggered  when changing the ads audience', async () => {
					let textContent = await setupBudgetPage
						.getBudgetRecommendationTextRow()
						.textContent();

					const textBeforeRemoveCountry =
						setupBudgetPage.extractBudgetRecommendationRange(
							textContent
						);

					const responsePromise =
						setupBudgetPage.registerBudgetRecommendationResponse();

					await removeCountryFromSearchBox(
						page,
						'United States (US)'
					);

					await responsePromise;

					textContent = await setupBudgetPage
						.getBudgetRecommendationTextRow()
						.textContent();

					const textAfterRemoveCountry =
						setupBudgetPage.extractBudgetRecommendationRange(
							textContent
						);

					await expect( textBeforeRemoveCountry ).not.toBe(
						textAfterRemoveCountry
					);
				} );
			} );

			test.describe( 'Set up budget', () => {
				test( 'should see the low budget tip when the buget is set lower than the recommended value', async () => {
					await setupBudgetPage.fillBudget( '1' );
					const lowBudgetTip = setupBudgetPage.getLowerBudgetTip();
					await expect( lowBudgetTip ).toBeVisible();
				} );

				test( 'should not see the low budget tip when the buget is set higher than the recommended value', async () => {
					await setupBudgetPage.fillBudget( '99999' );
					const lowBudgetTip = setupBudgetPage.getLowerBudgetTip();
					await expect( lowBudgetTip ).not.toBeVisible();
				} );
			} );

			test.describe( 'Set up billing', () => {
				let newPage;

				test( 'should see set up billing button is enabled', async () => {
					const setUpBillingButton =
						setupBudgetPage.getSetUpBillingButton();
					await expect( setUpBillingButton ).toBeEnabled();
				} );

				test( 'should see the correct set up billing link', async () => {
					const setUpBillingLink =
						setupBudgetPage.getSetUpBillingLink();
					await expect( setUpBillingLink ).toHaveAttribute(
						'href',
						'https://support.google.com/google-ads/answer/2375375'
					);
				} );

				test( 'should open a popup when clicking set up billing button', async () => {
					const popupPromise = page.waitForEvent( 'popup' );
					await setupBudgetPage.clickSetUpBillingButton();
					const popup = await popupPromise;
					await popup.waitForLoadState();
					const popupTitle = await popup.title();
					const popupURL = popup.url();
					expect( popupTitle ).toBe(
						'Add a new payment method in Google Ads - Google Ads Help'
					);
					expect( popupURL ).toBe(
						'https://support.google.com/google-ads/answer/2375375'
					);
					await popup.close();
				} );

				test( 'should open a new page when clicking set up billing link', async () => {
					const newPagePromise = page.waitForEvent( 'popup' );
					await setupBudgetPage.clickSetUpBillingLink();
					newPage = await newPagePromise;
					await newPage.waitForLoadState();
					const newPageTitle = await newPage.title();
					const newPageURL = newPage.url();
					expect( newPageTitle ).toBe(
						'Add a new payment method in Google Ads - Google Ads Help'
					);
					expect( newPageURL ).toBe(
						'https://support.google.com/google-ads/answer/2375375'
					);
				} );

				test( 'should see billing has been set up successfully when billing status API returns approved', async () => {
					await setupBudgetPage.fulfillBillingStatusRequest( {
						status: 'approved',
					} );

					await newPage.close();
					await page.reload();

					const billingSetupSuccessSection =
						setupBudgetPage.getBillingSetupSuccessSection();
					await expect( billingSetupSuccessSection ).toContainText(
						'Billing method for Google Ads added successfully'
					);
				} );

				test( 'should see "Complete setup" button is enabled', async () => {
					const button = completeCampaign.getCompleteSetupButton();
					await expect( button ).toBeEnabled();
				} );

				test( 'should go to "Product Feed" when clicking "Complete setup" button', async () => {
					await completeCampaign.fulfillAdsCampaignsRequest();
					const requestsPromises =
						completeCampaign.registerCompleteSetupRequests();
					await completeCampaign.clickCompleteSetupButton();
					await requestsPromises;

					const setupSuccessModal = page
						.locator( '.components-modal__content' )
						.filter( {
							hasText:
								'You’ve successfully set up Google Listings & Ads!',
						} );
					await expect( setupSuccessModal ).toBeVisible();
				} );
			} );
		} );
	} );
} );
