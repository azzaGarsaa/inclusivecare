import { FormControl, FormGroup } from '@angular/forms';
import { emailValidators, newPasswordValidators, readyToSubmit } from './form-utils';

describe('readyToSubmit', () => {
  function setup() {
    const form = new FormGroup({
      email: new FormControl('', { nonNullable: true, validators: emailValidators }),
      password: new FormControl('', { nonNullable: true, validators: newPasswordValidators }),
    });
    const element = document.createElement('form');
    element.innerHTML = `<input name="email" class="ng-valid" /><input name="password" class="ng-invalid" />`;
    document.body.append(element);
    return { form, element };
  }

  it('accepts a valid form', () => {
    const { form, element } = setup();
    form.setValue({ email: 'amina@example.test', password: 'long enough password' });
    expect(readyToSubmit(form, element)).toBe(true);
  });

  it('reveals the errors and focuses the first invalid field', () => {
    const { form, element } = setup();
    form.controls.email.setValue('amina@example.test');

    expect(readyToSubmit(form, element)).toBe(false);
    expect(form.controls.password.touched).toBe(true);
    expect(document.activeElement).toBe(element.querySelector('[name=password]'));
  });

  it('applies the same password length rule as the API', () => {
    const control = new FormControl('123456789', {
      nonNullable: true,
      validators: newPasswordValidators,
    });
    expect(control.errors).toHaveProperty('minlength');
    control.setValue('1234567890');
    expect(control.valid).toBe(true);
  });
});
