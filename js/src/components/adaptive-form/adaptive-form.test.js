/**
 * External dependencies
 */
import '@testing-library/jest-dom';
import { screen, render, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Internal dependencies
 */
import AdaptiveForm from './adaptive-form';

const alwaysValid = () => ( {} );

const delayOneSecond = () => new Promise( ( r ) => setTimeout( r, 1000 ) );

describe( 'AdaptiveForm', () => {
	it( 'Should have `formContext.adapter` with functions and initial states', () => {
		const children = jest.fn();

		render(
			<AdaptiveForm validate={ alwaysValid }>{ children }</AdaptiveForm>
		);

		const formContextSchema = expect.objectContaining( {
			adapter: expect.objectContaining( {
				isSubmitting: false,
				isSubmitted: false,
				submitter: null,
				validationRequestCount: 0,
				requestedShowValidation: false,
				showValidation: expect.any( Function ),
				hideValidation: expect.any( Function ),
			} ),
		} );

		expect( children ).toHaveBeenLastCalledWith( formContextSchema );
	} );

	it( 'Should provide `isSubmitting` and `isSubmitted` states via adapter', async () => {
		const inspect = jest.fn();

		render(
			<AdaptiveForm validate={ alwaysValid } onSubmit={ delayOneSecond }>
				{ ( formContext ) => {
					const { isSubmitting, isSubmitted } = formContext.adapter;
					inspect( isSubmitting, isSubmitted );

					return <button onClick={ formContext.handleSubmit } />;
				} }
			</AdaptiveForm>
		);

		expect( inspect ).toHaveBeenLastCalledWith( false, false );

		await act( async () => {
			return userEvent.click( screen.getByRole( 'button' ) );
		} );

		expect( inspect ).toHaveBeenLastCalledWith( true, false );

		await act( async () => {
			jest.runOnlyPendingTimers();
		} );

		expect( inspect ).toHaveBeenLastCalledWith( false, true );
	} );

	it( 'Should be able to signal failed submission to reset `isSubmitting` and `isSubmitted` states', async () => {
		const inspect = jest.fn();

		const onSubmit = ( values, enhancer ) => {
			enhancer.signalFailedSubmission();
			return delayOneSecond();
		};

		render(
			<AdaptiveForm validate={ alwaysValid } onSubmit={ onSubmit }>
				{ ( formContext ) => {
					const { isSubmitting, isSubmitted } = formContext.adapter;
					inspect( isSubmitting, isSubmitted );

					return <button onClick={ formContext.handleSubmit } />;
				} }
			</AdaptiveForm>
		);

		await act( async () => {
			return userEvent.click( screen.getByRole( 'button' ) );
		} );

		expect( inspect ).toHaveBeenLastCalledWith( true, false );

		await act( async () => {
			jest.runOnlyPendingTimers();
		} );

		expect( inspect ).toHaveBeenLastCalledWith( false, false );
	} );

	it( 'Should provide the element triggering the form submission via `submitter` until the processing is completed', async () => {
		const inspectOnSubmit = jest.fn();
		const inspectSubmitter = jest.fn();

		render(
			<AdaptiveForm validate={ alwaysValid } onSubmit={ inspectOnSubmit }>
				{ ( formContext ) => {
					inspectSubmitter( formContext.adapter.submitter );

					return (
						<>
							<button onClick={ formContext.handleSubmit }>
								A
							</button>

							<button onClick={ formContext.handleSubmit }>
								B
							</button>
						</>
					);
				} }
			</AdaptiveForm>
		);

		const [ buttonA, buttonB ] = screen.getAllByRole( 'button' );

		expect( inspectOnSubmit ).toHaveBeenCalledTimes( 0 );

		await act( async () => {
			return userEvent.click( buttonA );
		} );

		expect( inspectSubmitter ).toHaveBeenCalledWith( buttonA );
		expect( inspectSubmitter ).toHaveBeenLastCalledWith( null );
		expect( inspectOnSubmit ).toHaveBeenCalledTimes( 1 );
		expect( inspectOnSubmit ).toHaveBeenLastCalledWith(
			{},
			expect.objectContaining( { submitter: buttonA } )
		);

		inspectSubmitter.mockClear();

		await act( async () => {
			return userEvent.click( buttonB );
		} );

		expect( inspectSubmitter ).toHaveBeenCalledWith( buttonB );
		expect( inspectSubmitter ).toHaveBeenLastCalledWith( null );
		expect( inspectOnSubmit ).toHaveBeenCalledTimes( 2 );
		expect( inspectOnSubmit ).toHaveBeenLastCalledWith(
			{},
			expect.objectContaining( { submitter: buttonB } )
		);
	} );

	it( 'Should be able to accumulate and reset the validation request count and requested state', async () => {
		const inspect = jest.fn();

		render(
			<AdaptiveForm validate={ alwaysValid }>
				{ ( { adapter } ) => {
					inspect(
						adapter.requestedShowValidation,
						adapter.validationRequestCount
					);

					return (
						<>
							<button onClick={ adapter.showValidation }>
								request
							</button>

							<button onClick={ adapter.hideValidation }>
								reset
							</button>
						</>
					);
				} }
			</AdaptiveForm>
		);

		const requestButton = screen.getByRole( 'button', { name: 'request' } );
		const resetButton = screen.getByRole( 'button', { name: 'reset' } );

		expect( inspect ).toHaveBeenLastCalledWith( false, 0 );

		await userEvent.click( requestButton );

		expect( inspect ).toHaveBeenLastCalledWith( true, 1 );

		await userEvent.click( requestButton );

		expect( inspect ).toHaveBeenLastCalledWith( true, 2 );

		await userEvent.click( resetButton );

		expect( inspect ).toHaveBeenLastCalledWith( false, 0 );
	} );

	describe( 'Compatibility patches', () => {
		it( 'Should update all changes to values for the synchronous multiple calls to `setValue`', async () => {
			render(
				<AdaptiveForm
					initialValues={ {
						firstName: 'Foo',
						lastName: 'Bar',
						email: '(empty)',
					} }
					validate={ alwaysValid }
				>
					{ ( { setValue, values } ) => {
						return (
							<>
								<button
									onClick={ () => {
										setValue( 'firstName', 'Hey' );
										setValue( 'lastName', 'Howdy' );
										setValue( 'email', 'hi[at]greetings' );
									} }
								/>
								<article>
									{ `${ values.firstName } ${ values.lastName } ${ values.email }` }
								</article>
							</>
						);
					} }
				</AdaptiveForm>
			);

			const article = screen.getByRole( 'article' );

			expect( article.textContent ).toBe( 'Foo Bar (empty)' );

			await act( async () => {
				await userEvent.click( screen.getByRole( 'button' ) );
				jest.runAllTimers();
			} );

			expect( article.textContent ).toBe( 'Hey Howdy hi[at]greetings' );
		} );

		it( 'Should call back to `onChange` for the changed value only', async () => {
			const onChange = jest.fn();

			render(
				<AdaptiveForm
					onChange={ onChange }
					initialValues={ {
						firstName: '',
						lastName: '',
						agreedTerms: false,
					} }
					validate={ alwaysValid }
				>
					{ ( { setValue, getInputProps } ) => {
						return (
							<>
								<button
									onClick={ () => {
										setValue( 'firstName', 'Hey' );
									} }
								/>
								<input
									type="text"
									{ ...getInputProps( 'lastName' ) }
								/>
								<input
									type="checkbox"
									{ ...getInputProps( 'agreedTerms' ) }
								/>
							</>
						);
					} }
				</AdaptiveForm>
			);

			await act( async () => {
				await userEvent.click( screen.getByRole( 'button' ) );
				jest.runAllTimers();
			} );

			expect( onChange ).toHaveBeenCalledTimes( 1 );
			expect( onChange ).toHaveBeenLastCalledWith(
				{ name: 'firstName', value: 'Hey' },
				expect.any( Object ),
				true
			);

			await userEvent.type( screen.getByRole( 'textbox' ), 'a' );

			expect( onChange ).toHaveBeenCalledTimes( 2 );
			expect( onChange ).toHaveBeenLastCalledWith(
				{ name: 'lastName', value: 'a' },
				expect.any( Object ),
				true
			);

			await userEvent.click( screen.getByRole( 'checkbox' ) );

			expect( onChange ).toHaveBeenCalledTimes( 3 );
			expect( onChange ).toHaveBeenLastCalledWith(
				{ name: 'agreedTerms', value: true },
				expect.any( Object ),
				true
			);
		} );
	} );
} );
