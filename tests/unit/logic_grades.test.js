describe('Unit: Grading Calculation Service', () => {

    // Test Set 1: Weighted Average (10 Assertions)
    const calculateAverage = (midterm, final) => (midterm * 0.4) + (final * 0.6);

    test('Should calculate basic weighted average', () => {
        expect(calculateAverage(100, 100)).toBe(100);
        expect(calculateAverage(0, 0)).toBe(0);
        expect(calculateAverage(50, 50)).toBe(50);
    });

    test('Should weight final exam higher', () => {
        // Midterm 0, Final 100 -> 60
        expect(calculateAverage(0, 100)).toBe(60);
        // Midterm 100, Final 0 -> 40
        expect(calculateAverage(100, 0)).toBe(40);
    });

    test('Should handle floating point averages', () => {
        expect(calculateAverage(55, 65)).toBe(61); // 22 + 39
        expect(calculateAverage(81, 72)).toBeCloseTo(75.6);
    });

    // Test Set 2: Letter Grade Determination (10 Assertions)
    const getLetter = (grade) => {
        if (grade >= 90) return 'AA';
        if (grade >= 85) return 'BA';
        if (grade >= 80) return 'BB';
        if (grade >= 75) return 'CB';
        if (grade >= 70) return 'CC';
        if (grade >= 60) return 'DC';
        if (grade >= 50) return 'DD';
        if (grade >= 45) return 'FD';
        return 'FF';
    };

    test('Should assign AA correctly', () => {
        expect(getLetter(90)).toBe('AA');
        expect(getLetter(100)).toBe('AA');
        expect(getLetter(89.9)).not.toBe('AA');
    });

    test('Should assign failing grades correctly', () => {
        expect(getLetter(49)).toBe('FD');
        expect(getLetter(44)).toBe('FF');
        expect(getLetter(0)).toBe('FF');
    });

    test('Should assign boundary grades correctly', () => {
        expect(getLetter(70)).toBe('CC');
        expect(getLetter(85)).toBe('BA');
        expect(getLetter(84.99)).toBe('BB');
    });

    // Test Set 3: Status Determination
    const getStatus = (letter) => (letter === 'FF' || letter === 'FD') ? 'failed' : 'passed';

    test('Should determine pass/fail status', () => {
        expect(getStatus('AA')).toBe('passed');
        expect(getStatus('CC')).toBe('passed');
        expect(getStatus('DD')).toBe('passed');
        expect(getStatus('FD')).toBe('failed');
        expect(getStatus('FF')).toBe('failed');
    });
});
