import {
  doIntervalsOverlap, isClose, sortCompareEntriesByTime,
  entryListToTree, findIntervalAtTime, findPointAtTime
} from '../../../lib';

test('testing intervals that do and do not overlap', () => {
  // Non-overlapping, A occurs before B
  expect(doIntervalsOverlap([0, 1], [2, 3])).toEqual(false);

  // Non-overlapping, B occurs before A
  expect(doIntervalsOverlap([2, 3], [0, 1])).toEqual(false);

  // Shared border
  expect(doIntervalsOverlap([0, 1], [1, 3])).toEqual(false);

  // Overlapping
  expect(doIntervalsOverlap([0, 1], [0.5, 3])).toEqual(true);

  // A wholly contains B
  expect(doIntervalsOverlap([0, 5], [1, 3])).toEqual(true);

  // B wholly contains A
  expect(doIntervalsOverlap([1.1, 2.8], [0.7, 9000.0])).toEqual(true);

  // A and B match exactly
  expect(doIntervalsOverlap([1, 3], [1, 3])).toEqual(true);
});

test('testing isClose for various values', () => {
  // By default, the required precision is very high
  expect(isClose(1.00000001, 1.00000002)).toEqual(false);

  // Values close to the threshold are not equal
  expect(isClose(1.00, 1.005, 0.001)).toEqual(false);

  // Values on the threshold are equal
  expect(isClose(1.00, 1.01, 0.01)).toEqual(true);

  // isClose returns true when differences are relatively small
  expect((1 + 1e-15) === (1 + 2e-15)).toEqual(false);
  expect(isClose(1 + 1e-15, 1 + 2e-15)).toEqual(true);

  // but isClose returns false when differences are relatively large
  expect(1e-15 === 2e-15).toEqual(false);
  expect(isClose(1e-15, 2e-15)).toEqual(false);
});

test('sortCompareEntriesByTime subtracts the first two elements in the input lists', () => {
  expect(sortCompareEntriesByTime([3, 2], [1, 400])).toEqual(2);
  expect(sortCompareEntriesByTime([5, 'a'], [200])).toEqual(-195);
  expect(sortCompareEntriesByTime([4, 'b'], [4, 'hello'])).toEqual(0);
});

test('sortCompareEntriesByTime will sort entries by time', () => {
  const unsortedList = [[90, 'a'], [15, 'b'], [0.1, 'c']];
  const sortedList = [[0.1, 'c'], [15, 'b'], [90, 'a']];

  expect(unsortedList).not.toEqual(sortedList);
  unsortedList.sort(sortCompareEntriesByTime);
  expect(unsortedList).toEqual(sortedList);
});

function getSampleIntervals () {
  const nodeA = [0, 1, 'a'];
  const nodeB = [2, 3, 'b'];
  const nodeC = [5, 10, 'c'];

  const nodeD = [12, 18, 'd'];

  const nodeE = [25, 32, 'e'];
  const nodeF = [41, 53, 'f'];
  const nodeG = [54, 58, 'g'];

  return [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG];
}

function getSamplePoints () {
  const nodeA = [0, 'a'];
  const nodeB = [2, 'b'];
  const nodeC = [4, 'c'];

  const nodeD = [12, 'd'];

  const nodeE = [25, 'e'];
  const nodeF = [41, 'f'];
  const nodeG = [54, 'g'];

  return [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG];
}

test('entryListToTree will build a tree from an entry list with an even number of nodes; entryListToTree works with intervals', () => {
  const [nodeA, nodeB, nodeC, nodeD] = getSampleIntervals();

  const entryList1 = [nodeA, nodeB, nodeC, nodeD];
  const tree1 = entryListToTree(entryList1);

  expect(tree1.entry).toEqual(nodeC);

  expect(tree1.left.entry).toEqual(nodeB);
  expect(tree1.right.entry).toEqual(nodeD);

  expect(tree1.left.left.entry).toEqual(nodeA);
  expect(tree1.left.right).toEqual(null);

  expect(tree1.right.left).toEqual(null);
  expect(tree1.right.right).toEqual(null);
});

test('entryListToTree will build a tree from an entry list with an odd number of nodes; entryListToTree works with points', () => {
  const [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG] = getSamplePoints();

  const entryList1 = [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG];
  const tree1 = entryListToTree(entryList1);

  expect(tree1.entry).toEqual(nodeD);

  expect(tree1.left.entry).toEqual(nodeB);
  expect(tree1.right.entry).toEqual(nodeF);

  expect(tree1.left.left.entry).toEqual(nodeA);
  expect(tree1.left.right.entry).toEqual(nodeC);

  expect(tree1.right.left.entry).toEqual(nodeE);
  expect(tree1.right.right.entry).toEqual(nodeG);
});

test('no tree is made if the list is empty', () => {
  const tree1 = entryListToTree([]);
  expect(tree1).toEqual(null);
});

test('entryListToTree orders the input entries', () => {
  const [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG] = getSampleIntervals();

  const entryList1 = [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG];
  const entryList2 = [nodeG, nodeB, nodeA, nodeD, nodeF, nodeC, nodeE];

  const tree1 = entryListToTree(entryList1);
  const tree2 = entryListToTree(entryList2);

  expect(tree1).toEqual(tree2);
});

test('findIntervalAtTime works', () => {
  const [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG] = getSampleIntervals();

  const entryList = [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG];
  const tree = entryListToTree(entryList);

  expect(findIntervalAtTime(5, tree)).toEqual(nodeC);
  expect(findIntervalAtTime(14, tree)).toEqual(nodeD);
  expect(findIntervalAtTime(58, tree)).toEqual(nodeG);
  expect(findIntervalAtTime(4, tree)).toEqual(null);
});

test('findPointsAtTime works', () => {
  const [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG] = getSamplePoints();

  const entryList = [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG];
  const tree = entryListToTree(entryList);

  expect(findPointAtTime(4, tree, false)).toEqual(nodeC);
  expect(findPointAtTime(12, tree, false)).toEqual(nodeD);
  expect(findPointAtTime(54, tree, false)).toEqual(nodeG);
  expect(findPointAtTime(4.5, tree, false)).toEqual(null);
});

test('findPointsAtTime returns the closest value if findClosest is true', () => {
  const [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG] = getSamplePoints();

  const entryList = [nodeA, nodeB, nodeC, nodeD, nodeE, nodeF, nodeG];
  const tree = entryListToTree(entryList);

  expect(findPointAtTime(12, tree, true)).toEqual(nodeD); // exact matches still work
  expect(findPointAtTime(3, tree, true)).toEqual(nodeB); // equidistant between two points
  expect(findPointAtTime(5.5, tree, true)).toEqual(nodeC);
  expect(findPointAtTime(35.1234, tree, true)).toEqual(nodeF);
  expect(findPointAtTime(1000, tree, true)).toEqual(nodeG); // extreme values are ok
});
