import { calculateCanvasPageSlices } from './pdfPagination';

test('keeps a one-page canvas as one complete slice', () => {
  expect(calculateCanvasPageSlices(1000, 1200)).toEqual([
    { sourceY: 0, height: 1200 },
  ]);
});

test('splits a two-page canvas without overlap or gaps', () => {
  expect(calculateCanvasPageSlices(1000, 2200)).toEqual([
    { sourceY: 0, height: 1414 },
    { sourceY: 1414, height: 786 },
  ]);
});

test('keeps every pixel exactly once across three pages', () => {
  const slices = calculateCanvasPageSlices(1000, 3000);

  expect(slices).toEqual([
    { sourceY: 0, height: 1414 },
    { sourceY: 1414, height: 1415 },
    { sourceY: 2829, height: 171 },
  ]);
  expect(slices.reduce((total, slice) => total + slice.height, 0)).toBe(3000);
});
