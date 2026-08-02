// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CollectionsAndMapping
 * @dev Ch05-1 실습 (3/4) — 배열·구조체·매핑
 *
 * 학습 포인트:
 * - 고정 배열 / 동적 배열 조작 (push/pop/length)
 * - 원소 제거 트레이드오프 (swap-and-pop vs shift)
 * - 배열 순회의 함정 (gas 한도)
 * - struct 선언·생성·저장·storage 참조 함정
 * - mapping 기본 사용
 * - mapping의 한계 (전체 순회 불가) + 키 목록 관리 패턴
 */
contract CollectionsAndMapping {

    // ── 배열 ─────────────────────────────────────────

    /// 동적 배열
    uint256[] public dynamic;

    /// 고정 크기 배열 (컴파일 타임 결정)
    uint256[5] public fixedArr;

    function pushDynamic(uint256 v) external {
        dynamic.push(v);
    }

    function popDynamic() external {
        dynamic.pop();
    }

    function lengthDynamic() external view returns (uint256) {
        return dynamic.length;
    }

    function setFixed(uint256 index, uint256 v) external {
        fixedArr[index] = v;
    }

    // ── 원소 제거 — swap-and-pop (권장, O(1)) ────────

    /**
     * @dev 순서 유지 필요 없을 때 — 마지막 원소로 덮고 pop
     */
    function removeSwapPop(uint256 index) external {
        require(index < dynamic.length, "out of range");
        uint256 last = dynamic.length - 1;
        if (index != last) {
            dynamic[index] = dynamic[last];
        }
        dynamic.pop();
    }

    // ── 원소 제거 — shift (순서 유지, O(n)) ──────────

    /**
     * @dev 순서 유지가 필요할 때 — 큰 배열에서는 gas 폭발 주의
     */
    function removeShift(uint256 index) external {
        require(index < dynamic.length, "out of range");
        for (uint256 i = index; i < dynamic.length - 1; ) {
            dynamic[i] = dynamic[i + 1];
            unchecked { ++i; }
        }
        dynamic.pop();
    }

    /// 배열 전체 초기화 — O(n) 가스
    function clearArray() external {
        delete dynamic;
    }

    // ── 배열 순회 함정 — gas 폭발 시나리오 ───────────

    /**
     * @dev 배열 길이가 무제한으로 커지면 순회 함수는 gas limit 초과로 영구 실패
     *      해결: pagination(from, to) 또는 offchain 처리
     */
    function sumPage(uint256 from, uint256 to)
        external
        view
        returns (uint256 s)
    {
        require(to <= dynamic.length && from <= to, "invalid range");
        for (uint256 i = from; i < to; ) {
            s += dynamic[i];
            unchecked { ++i; }
        }
    }

    // ── 구조체 ───────────────────────────────────────

    struct Book {
        string title;
        uint256 pages;
        bool inStock;
    }

    Book[] public books;

    function addBook(string calldata title, uint256 pages) external {
        // 방법 1: 이름 있는 생성자
        books.push(Book({ title: title, pages: pages, inStock: true }));
    }

    function addBookPositional(string calldata title, uint256 pages) external {
        // 방법 2: 위치 인자
        books.push(Book(title, pages, true));
    }

    /**
     * @dev storage 참조 함정 — 아래 두 함수 비교
     */

    /// storage 참조: 상태를 직접 수정
    function markOutOfStock(uint256 idx) external {
        Book storage b = books[idx];
        b.inStock = false; // ← 진짜 상태 변경
    }

    /// memory 복사: 로컬만 수정, 상태 변화 없음 (흔한 실수)
    function markOutOfStockBad(uint256 idx) external {
        Book memory b = books[idx];
        b.inStock = false; // ← 로컬 변수만 바뀌고 books[idx]는 그대로
    }

    // ── 매핑 (Mapping) ───────────────────────────────

    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;

    function setBalance(address a, uint256 v) external {
        balances[a] = v;
    }

    function setAllowance(address owner_, address spender, uint256 v) external {
        allowances[owner_][spender] = v;
    }

    /**
     * @dev mapping의 특성: 미설정 키 조회 시 zero value 반환 (존재/부재 구분 불가)
     */
    function getBalanceOr(address a, uint256 fallback_) external view returns (uint256) {
        uint256 v = balances[a];
        return v == 0 ? fallback_ : v;
    }

    // ── 매핑 — 키 목록 관리 패턴 (순회 가능하게 만들기) ──

    /**
     * @dev mapping 자체는 순회 불가.
     *      필요하면 별도 배열로 키 목록을 유지 (중복 방지 플래그와 함께).
     *      OpenZeppelin의 EnumerableSet과 같은 접근.
     */
    address[] private _holders;
    mapping(address => bool) private _isHolder;

    function addHolder(address a, uint256 v) external {
        balances[a] = v;
        if (!_isHolder[a]) {
            _isHolder[a] = true;
            _holders.push(a);
        }
    }

    function holderCount() external view returns (uint256) {
        return _holders.length;
    }

    function holderAt(uint256 i) external view returns (address) {
        return _holders[i];
    }

    function totalBalance() external view returns (uint256 sum) {
        uint256 len = _holders.length;
        for (uint256 i; i < len; ) {
            sum += balances[_holders[i]];
            unchecked { ++i; }
        }
    }
}
