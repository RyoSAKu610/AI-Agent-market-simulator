// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title KOGANE (光金), the base currency of Kaleidoscope Zipangu, on an EVM test network
/// @notice The receipt token of chain mode (zipangu/docs/ONCHAIN.md). Whoever deploys it is the
/// world engine ("treasury"): the only one who can mint, and the operator who moves balances
/// between the residents' and the markets' addresses, as the treasury is every token account's
/// delegate on Solana devnet. Holders can also send their own balance like any ERC-20.
/// For test networks only. It has no value.
/// @dev Built by zipangu/tools/kogane-build.mjs (solc 0.8.28, optimizer 200 runs, EVM paris);
/// the bytecode the page deploys is in zipangu/js/kogane.js.
contract Kogane {
    string public constant name = "KOGANE";
    string public constant symbol = "KOGANE";
    uint8 public constant decimals = 2;

    address public immutable treasury;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    /// What the world did in this batch, in the same words as the Solana memo (`zipangu:…`).
    event Memo(string text);

    error OnlyTreasury();
    error LengthMismatch();
    error Insufficient(address from, uint256 have, uint256 want);

    constructor() {
        treasury = msg.sender;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _move(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < value) revert Insufficient(from, allowed, value);
            allowance[from][msg.sender] = allowed - value;
        }
        _move(from, to, value);
        return true;
    }

    /// @notice One batch of the world's trades: labelled top-up mints first, then the moves,
    /// then the memo. All or nothing.
    function batch(
        address[] calldata mintTo,
        uint256[] calldata mintAmount,
        address[] calldata from,
        address[] calldata to,
        uint256[] calldata amount,
        string calldata memo
    ) external {
        if (msg.sender != treasury) revert OnlyTreasury();
        if (mintTo.length != mintAmount.length || from.length != to.length || to.length != amount.length) revert LengthMismatch();
        for (uint256 i = 0; i < mintTo.length; ++i) {
            totalSupply += mintAmount[i];
            balanceOf[mintTo[i]] += mintAmount[i];
            emit Transfer(address(0), mintTo[i], mintAmount[i]);
        }
        for (uint256 i = 0; i < from.length; ++i) _move(from[i], to[i], amount[i]);
        if (bytes(memo).length != 0) emit Memo(memo);
    }

    function _move(address from, address to, uint256 value) private {
        uint256 have = balanceOf[from];
        if (have < value) revert Insufficient(from, have, value);
        unchecked {
            balanceOf[from] = have - value;
        }
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
