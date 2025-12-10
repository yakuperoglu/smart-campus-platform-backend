const Joi = require('joi');
const { changePasswordSchema } = require('../../src/validators/userValidators');

describe('User Validators', () => {
    describe('changePasswordSchema', () => {
        it('should validate a valid password change request', () => {
            const validData = {
                currentPassword: 'OldPassword123!',
                newPassword: 'NewPassword123!',
                confirmPassword: 'NewPassword123!'
            };

            const { error } = changePasswordSchema.body.validate(validData);
            expect(error).toBeUndefined();
        });

        it('should fail if new passwords do not match', () => {
            const invalidData = {
                currentPassword: 'OldPassword123!',
                newPassword: 'NewPassword123!',
                confirmPassword: 'DifferentPassword123!'
            };

            const { error } = changePasswordSchema.body.validate(invalidData);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Passwords do not match');
        });

        it('should fail if new password is too short', () => {
            const invalidData = {
                currentPassword: 'OldPassword123!',
                newPassword: 'Short1!',
                confirmPassword: 'Short1!'
            };

            const { error } = changePasswordSchema.body.validate(invalidData);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('at least 8 characters');
        });

        it('should fail if new password complexity requirements are not met', () => {
            const invalidData = {
                currentPassword: 'OldPassword123!',
                newPassword: 'simplepassword',
                confirmPassword: 'simplepassword'
            };

            const { error } = changePasswordSchema.body.validate(invalidData);
            expect(error).toBeDefined();
        });
    });
});
