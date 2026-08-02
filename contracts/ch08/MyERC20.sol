// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MyERC20
 * @dev Ch08 실습 — ERC-20 표준 직접 구현 (OpenZeppelin 사용 안 함)
 *
 * 학습 포인트:
 * - ERC-20 7개 함수 (totalSupply/balanceOf/transfer/allowance/approve/transferFrom + name/symbol/decimals)
 * - Transfer / Approval 이벤트
 * - allowance 메커니즘
 * - mint/burn 내부 함수
 *
 * ⚠️ 실전 프로덕션에서는 OpenZeppelin ERC20 사용 권장.
 *    이 파일은 표준 이해 목적의 학습용 구현.
 */
contract MyERC20 {

    // ── 메타데이터 ───────────────────────────────────
    string  public name;
    string  public symbol;
    uint8   public immutable decimals;

    // ── 상태 ─────────────────────────────────────────
    uint256 public totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    address public owner;

    // ── 이벤트 (ERC-20 표준) ────────────────────────
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // ── 에러 ─────────────────────────────────────────
    error ZeroAddress();
    error InsufficientBalance(uint256 available, uint256 required);
    error InsufficientAllowance(uint256 available, uint256 required);
    error NotOwner();

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── ERC-20 표준 함수 ────────────────────────────

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function allowance(address holder, address spender)
        public view returns (uint256)
    {
        return _allowances[holder][spender];
    }

    /**
     * @dev 호출자 → to로 토큰 이동
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev spender에게 allowance 부여
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /**
     * @dev spender가 from의 토큰을 to에게 이동
     *      approve로 부여받은 allowance 내에서만 가능
     */
    function transferFrom(address from, address to, uint256 amount)
        external returns (bool)
    {
        _spendAllowance(from, msg.sender, amount);
        _transfer(from, to, amount);
        return true;
    }

    // ── Owner 전용: 발행/소각 ────────────────────────
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    // ── 내부 함수 ────────────────────────────────────
    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 fromBalance = _balances[from];
        if (fromBalance < amount) revert InsufficientBalance(fromBalance, amount);

        unchecked {
            _balances[from] = fromBalance - amount;
            _balances[to] += amount;
        }
        emit Transfer(from, to, amount);
    }

    function _approve(address holder, address spender, uint256 amount) internal {
        if (holder == address(0) || spender == address(0)) revert ZeroAddress();
        _allowances[holder][spender] = amount;
        emit Approval(holder, spender, amount);
    }

    function _spendAllowance(address holder, address spender, uint256 amount) internal {
        uint256 current = _allowances[holder][spender];
        // type(uint256).max는 무한 승인으로 간주 (감소하지 않음)
        if (current != type(uint256).max) {
            if (current < amount) revert InsufficientAllowance(current, amount);
            unchecked {
                _approve(holder, spender, current - amount);
            }
        }
    }

    function _mint(address to, uint256 amount) internal {
        if (to == address(0)) revert ZeroAddress();
        totalSupply += amount;
        unchecked {
            _balances[to] += amount;
        }
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        uint256 bal = _balances[from];
        if (bal < amount) revert InsufficientBalance(bal, amount);
        unchecked {
            _balances[from] = bal - amount;
            totalSupply -= amount;
        }
        emit Transfer(from, address(0), amount);
    }
}
