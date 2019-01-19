
function doIntervalsOverlap (interval1, interval2) {
  let [start1, end1] = interval1;
  let [start2, end2] = interval2;

  let overlapAmount = Math.max(0, Math.min(end1, end2) - Math.max(start1, start2));
  return overlapAmount > 0;
}

function isClose (a, b, relTol = 1e-14, abs_tol = 0.0) {
  return Math.abs(a - b) <= Math.max(relTol * Math.max(Math.abs(a), Math.abs(b)), abs_tol)
}

function sortCompareEntriesByTime (x, y) {
  return x[0] - y[0];
}

export { doIntervalsOverlap, isClose, sortCompareEntriesByTime };
