export const binarySearch = function (
    arr,
    target,
    equalPredicate,
    comparePredicate,
) {
    let left = 0;
    let right = arr.length - 1;

    // 이를 위해 기본적으로 data model 은 pk 의 이름을 id 로 사용해야한다.
    if (equalPredicate === undefined) {
        equalPredicate = (a, b) => a.id === b;
    }

    if (comparePredicate === undefined) {
        comparePredicate = (a, b) => a.id < b;
    }

    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (equalPredicate(arr[mid], target)) {
            return mid;
        }
        if (comparePredicate(arr[mid], target)) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
};
