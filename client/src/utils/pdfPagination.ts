export type CanvasPageSlice = {
  sourceY: number;
  height: number;
};

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export function calculateCanvasPageSlices(
  canvasWidth: number,
  canvasHeight: number
): CanvasPageSlice[] {
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    throw new Error('Canvas dimensions must be positive');
  }

  const pageHeightPx = (canvasWidth * A4_HEIGHT_MM) / A4_WIDTH_MM;
  const slices: CanvasPageSlice[] = [];
  let sourceY = 0;
  let pageNumber = 1;

  while (sourceY < canvasHeight) {
    const pageEnd = Math.min(canvasHeight, Math.round(pageNumber * pageHeightPx));
    slices.push({ sourceY, height: pageEnd - sourceY });
    sourceY = pageEnd;
    pageNumber += 1;
  }

  return slices;
}
