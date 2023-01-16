//SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IWETH} from '@aave/core-v3/contracts/misc/interfaces/IWETH.sol';
import "../libs/BaseRelayRecipient.sol";
import "./aave2/Aave2DataTypes.sol";
import "./aave2/Aave2Interfaces.sol";
import "./aave3/Aave3DataTypes.sol";
import "./aave3/Aave3Interfaces.sol";
import "./common/DataTypes.sol";

contract AaveAdapter is OwnableUpgradeable, BaseRelayRecipient {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using SafeERC20Upgradeable for V3_IAToken;

    ILendingPoolAddressesProvider public immutable V2_ADDRESSES_PROVIDER;
    IAaveProtocolDataProvider public immutable V2_DATA_PROVIDER;
    ILendingPool public immutable V2_LENDING_POOL;

    IPoolAddressesProvider public immutable V3_ADDRESSES_PROVIDER;
    IPoolDataProvider public immutable V3_DATA_PROVIDER;
    IPool public immutable V3_POOL;

    IWETH public immutable WNATIVE;
    address public immutable aNATIVE;
    address internal immutable stableDebtWNATIVE;
    address internal immutable variableDebtWNATIVE;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address _v2DataProvider, address _v3AddressesProvider, address _wnative) {
        _disableInitializers();

        bool v2Supported = _v2DataProvider != address(0) ? true : false;
        V2_DATA_PROVIDER = IAaveProtocolDataProvider(_v2DataProvider);
        V2_ADDRESSES_PROVIDER = ILendingPoolAddressesProvider(v2Supported ? V2_DATA_PROVIDER.ADDRESSES_PROVIDER() : address(0));
        V2_LENDING_POOL = ILendingPool(v2Supported ? V2_ADDRESSES_PROVIDER.getLendingPool() : address(0));

        bool v3Supported = _v3AddressesProvider != address(0) ? true : false;
        V3_ADDRESSES_PROVIDER = IPoolAddressesProvider(_v3AddressesProvider);
        V3_DATA_PROVIDER = IPoolDataProvider(v3Supported ? V3_ADDRESSES_PROVIDER.getPoolDataProvider() : address(0));
        V3_POOL = IPool(v3Supported ? V3_ADDRESSES_PROVIDER.getPool() : address(0));

        WNATIVE = IWETH(_wnative);
        (aNATIVE, stableDebtWNATIVE, variableDebtWNATIVE) = (address(V2_DATA_PROVIDER) != address(0))
            ? V2_DATA_PROVIDER.getReserveTokensAddresses(_wnative)
            : V3_DATA_PROVIDER.getReserveTokensAddresses(_wnative);
    }

    function initialize(address _biconomy) public initializer {
        __Ownable_init();

        trustedForwarder = _biconomy;

        _approvePool();
    }

    function setBiconomy(address _biconomy) external onlyOwner {
        trustedForwarder = _biconomy;
    }

    function _msgSender() internal override(ContextUpgradeable, BaseRelayRecipient) view returns (address) {
        return BaseRelayRecipient._msgSender();
    }

    function versionRecipient() external pure override returns (string memory) {
        return "1";
    }

    /// @notice If new assets are added into the pool, it needs to be called.
    function approvePool() external onlyOwner {
        _approvePool();
    }

    function _approvePool() internal {
        if (address(V2_LENDING_POOL) != address(0)) {
            address[] memory reserves = V2_LENDING_POOL.getReservesList();
            for (uint i = 0; i < reserves.length; i++) {
                IERC20Upgradeable reserve = IERC20Upgradeable(reserves[i]);
                if (reserve.allowance(address(this), address(V2_LENDING_POOL)) == 0) {
                    reserve.safeApprove(address(V2_LENDING_POOL), type(uint).max);
                }
            }
        }
        if (address(V3_POOL) != address(0)) {
            address[] memory reserves = V3_POOL.getReservesList();
            for (uint i = 0; i < reserves.length; i++) {
                IERC20Upgradeable reserve = IERC20Upgradeable(reserves[i]);
                if (reserve.allowance(address(this), address(V3_POOL)) == 0) {
                    reserve.safeApprove(address(V3_POOL), type(uint).max);
                }
            }
        }
    }

    function getAllReservesTokens() public view returns (TokenDataEx[] memory tokens) {
        AaveDataTypes.TokenData[] memory v2Tokens;
        uint v2TokensLength;
        AaveDataTypes.TokenData[] memory v3Tokens;
        uint v3TokensLength;

        if (address(V2_DATA_PROVIDER) != address(0)) {
            v2Tokens = V2_DATA_PROVIDER.getAllReservesTokens();
            v2TokensLength = v2Tokens.length;
        }
        if (address(V3_DATA_PROVIDER) != address(0)) {
            v3Tokens = V3_DATA_PROVIDER.getAllReservesTokens();
            v3TokensLength = v3Tokens.length;
        }

        tokens = new TokenDataEx[](v2TokensLength + v3TokensLength);
        for (uint i = 0; i < v2TokensLength; i ++) {
            tokens[i].version = VERSION.V2;
            tokens[i].symbol = v2Tokens[i].symbol;
            tokens[i].tokenAddress = v2Tokens[i].tokenAddress;
        }
        uint index;
        for (uint i = 0; i < v3TokensLength; i ++) {
            index = v2TokensLength + i;
            tokens[index].version = VERSION.V3;
            tokens[index].symbol = v3Tokens[i].symbol;
            tokens[index].tokenAddress = v3Tokens[i].tokenAddress;
        }
    }

    /// @notice The user must approve this SC for the asset.
    function supply(uint version, address asset, uint amount) public {
        address account = _msgSender();
        IERC20Upgradeable(asset).safeTransferFrom(account, address(this), amount);

        if (uint(VERSION.V2) == version) {
            V2_LENDING_POOL.deposit(asset, amount, account, 0);
        } else {
            V3_POOL.supply(asset, amount, account, 0);
        }
    }

    function supplyETH(uint version) payable public {
        address account = _msgSender();
        WNATIVE.deposit{value: msg.value}();

        if (uint(VERSION.V2) == version) {
            V2_LENDING_POOL.deposit(address(WNATIVE), msg.value, account, 0);
        } else {
            V3_POOL.supply(address(WNATIVE), msg.value, account, 0);
        }
    }

    /// @notice The user must approve this SC for the asset's aToken.
    function withdraw(uint version, address asset, uint amount) public {
        address account = _msgSender();
        address aToken;

        if (uint(VERSION.V2) == version) {
            (aToken,,) = V2_DATA_PROVIDER.getReserveTokensAddresses(asset);
        } else {
            (aToken,,) = V3_DATA_PROVIDER.getReserveTokensAddresses(asset);
        }
        _withdraw(version, asset, amount, account, aToken);
    }

    function withdrawWithPermit(
        uint version, address asset, uint amount,
        uint permitAmount, uint permitDeadline, uint8 permitV, bytes32 permitR, bytes32 permitS
    ) public {
        address account = _msgSender();
        address aToken;

        if (uint(VERSION.V2) == version) {
            (aToken,,) = V2_DATA_PROVIDER.getReserveTokensAddresses(asset);
        } else {
            (aToken,,) = V3_DATA_PROVIDER.getReserveTokensAddresses(asset);
        }
        V3_IAToken(aToken).permit(account, address(this), permitAmount, permitDeadline, permitV, permitR, permitS);

        _withdraw(version, asset, amount, account, aToken);
    }

    function _withdraw(uint version, address asset, uint amount, address account, address aToken) internal {
        uint amountToWithdraw = amount;
        if (amount == type(uint).max) {
            amountToWithdraw = IERC20Upgradeable(aToken).balanceOf(account);
        }

        IERC20Upgradeable(aToken).safeTransferFrom(account, address(this), amountToWithdraw);
        if (uint(VERSION.V2) == version) {
            V2_LENDING_POOL.withdraw(asset, amountToWithdraw, account);
        } else {
            V3_POOL.withdraw(asset, amountToWithdraw, account);
        }
    }

    function withdrawETH(uint version, uint amount) public {
        _withdrawETH(version, amount, _msgSender());
    }

    function withdrawETHWithPermit(
        uint version, uint amount,
        uint permitAmount, uint permitDeadline, uint8 permitV, bytes32 permitR, bytes32 permitS
    ) public {
        address account = _msgSender();
        V3_IAToken(aNATIVE).permit(account, address(this), permitAmount, permitDeadline, permitV, permitR, permitS);
        _withdrawETH(version, amount, account);
    }

    function _withdrawETH(uint version, uint amount, address account) internal {
        uint amountToWithdraw = amount;
        if (amount == type(uint).max) {
            amountToWithdraw = IERC20Upgradeable(aNATIVE).balanceOf(account);
        }

        IERC20Upgradeable(aNATIVE).safeTransferFrom(account, address(this), amountToWithdraw);
        if (uint(VERSION.V2) == version) {
            V2_LENDING_POOL.withdraw(address(WNATIVE), amountToWithdraw, address(this));
        } else {
            V3_POOL.withdraw(address(WNATIVE), amountToWithdraw, address(this));
        }
        WNATIVE.withdraw(amountToWithdraw);
        _safeTransferETH(account, amountToWithdraw);
    }

    /// @notice The user must approve the delegation to this SC for the asset's debtToken.
    function borrow(uint version, address asset, uint amount, uint interestRateMode) public {
        address account = _msgSender();
        if (uint(VERSION.V2) == version) {
            V2_LENDING_POOL.borrow(asset, amount, interestRateMode, 0, account);
        } else {
            V3_POOL.borrow(asset, amount, interestRateMode, 0, account);
        }
        IERC20Upgradeable(asset).safeTransfer(account, amount);
    }

    /// @notice It works for only v3.
    function borrowWithPermit(
        address asset, uint amount, uint interestRateMode,
        uint permitAmount, uint permitDeadline, uint8 permitV, bytes32 permitR, bytes32 permitS
    ) public {
        address account = _msgSender();
        (, address stableDebtTokenAddress, address variableDebtTokenAddress) = V3_DATA_PROVIDER.getReserveTokensAddresses(asset);
        address debtToken = interestRateMode == 1 ? stableDebtTokenAddress : variableDebtTokenAddress;

        V3_ICreditDelegationToken(debtToken).delegationWithSig(
            account, address(this),
            permitAmount, permitDeadline, permitV, permitR, permitS);

        V3_POOL.borrow(asset, amount, interestRateMode, 0, account);
        IERC20Upgradeable(asset).safeTransfer(account, amount);
    }

    function borrowETH(uint version, uint amount, uint interestRateMode) public {
        address account = _msgSender();
        if (uint(VERSION.V2) == version) {
            V2_LENDING_POOL.borrow(address(WNATIVE), amount, interestRateMode, 0, account);
        } else {
            V3_POOL.borrow(address(WNATIVE), amount, interestRateMode, 0, account);
        }
        WNATIVE.withdraw(amount);
        _safeTransferETH(account, amount);
    }

    /// @notice It works for only v3.
    function borrowETHWithPermit(
        uint amount, uint interestRateMode,
        uint permitAmount, uint permitDeadline, uint8 permitV, bytes32 permitR, bytes32 permitS
    ) public {
        address account = _msgSender();
        address debtToken = interestRateMode == 1 ? stableDebtWNATIVE : variableDebtWNATIVE;

        V3_ICreditDelegationToken(debtToken).delegationWithSig(
            account, address(this),
            permitAmount, permitDeadline, permitV, permitR, permitS);

        V3_POOL.borrow(address(WNATIVE), amount, interestRateMode, 0, account);
        WNATIVE.withdraw(amount);
        _safeTransferETH(account, amount);
    }

    /// @notice The user must approve this SC for the asset.
    function repay(uint version, address asset, uint amount, uint interestRateMode) public {
        address account = _msgSender();

        uint paybackAmount = amount;
        if (amount == type(uint).max) {
            address stableDebtTokenAddress;
            address variableDebtTokenAddress;

            if (uint(VERSION.V2) == version) {
                (, stableDebtTokenAddress, variableDebtTokenAddress) = V2_DATA_PROVIDER.getReserveTokensAddresses(asset);
            } else {
                (, stableDebtTokenAddress, variableDebtTokenAddress) = V3_DATA_PROVIDER.getReserveTokensAddresses(asset);
            }
            paybackAmount = IERC20Upgradeable(interestRateMode == 1 ? stableDebtTokenAddress : variableDebtTokenAddress).balanceOf(account);
        }

        IERC20Upgradeable(asset).safeTransferFrom(account, address(this), paybackAmount);
        if (uint(VERSION.V2) == version) {
            V2_LENDING_POOL.repay(asset, paybackAmount, interestRateMode, account);
        } else {
            V3_POOL.repay(asset, paybackAmount, interestRateMode, account);
        }
    }

    function repayETH(uint version, uint amount, uint interestRateMode) payable public {
        address account = _msgSender();

        uint paybackAmount = amount;
        if (amount == type(uint).max) {
            paybackAmount = IERC20Upgradeable(interestRateMode == 1 ? stableDebtWNATIVE : variableDebtWNATIVE).balanceOf(account);
        }

        require(msg.value >= paybackAmount, 'msg.value is less than repayment amount');
        WNATIVE.deposit{value: paybackAmount}();
        if (uint(VERSION.V2) == version) {
            V2_LENDING_POOL.repay(address(WNATIVE), paybackAmount, interestRateMode, account);
        } else {
            V3_POOL.repay(address(WNATIVE), paybackAmount, interestRateMode, account);
        }

        uint left = msg.value - paybackAmount;
        if (left > 0) _safeTransferETH(account, left);
    }

    function supplyAndBorrow(uint version,
        address supplyAsset, uint supplyAmount,
        address borrowAsset, uint borrowAmount, uint borrowInterestRateMode
    ) external {
        supply(version, supplyAsset, supplyAmount);
        borrow(version, borrowAsset, borrowAmount, borrowInterestRateMode);
    }

    /// @notice It works for only v3.
    function supplyAndBorrowWithPermit(
        address supplyAsset, uint supplyAmount,
        address borrowAsset, uint borrowAmount, uint borrowInterestRateMode,
        uint permitAmount, uint permitDeadline, uint8 permitV, bytes32 permitR, bytes32 permitS
    ) external {
        supply(3, supplyAsset, supplyAmount);
        borrowWithPermit(borrowAsset, borrowAmount, borrowInterestRateMode,
            permitAmount, permitDeadline, permitV, permitR, permitS
        );
    }

    function supplyETHAndBorrow(uint version,
        address borrowAsset, uint borrowAmount, uint borrowInterestRateMode
    ) payable external {
        supplyETH(version);
        borrow(version, borrowAsset, borrowAmount, borrowInterestRateMode);
    }

    function supplyAndBorrowETH(uint version,
        address supplyAsset, uint supplyAmount,
        uint borrowAmount, uint borrowInterestRateMode
    ) external {
        supply(version, supplyAsset, supplyAmount);
        borrowETH(version, borrowAmount, borrowInterestRateMode);
    }

    /// @notice It works for only v3.
    function supplyETHAndBorrowWithPermit(
        address borrowAsset, uint borrowAmount, uint borrowInterestRateMode,
        uint permitAmount, uint permitDeadline, uint8 permitV, bytes32 permitR, bytes32 permitS
    ) payable external {
        supplyETH(3);
        borrowWithPermit(borrowAsset, borrowAmount, borrowInterestRateMode,
            permitAmount, permitDeadline, permitV, permitR, permitS
        );
    }

    /// @notice It works for only v3.
    function supplyAndBorrowETHWithPermit(
        address supplyAsset, uint supplyAmount,
        uint borrowAmount, uint borrowInterestRateMode,
        uint permitAmount, uint permitDeadline, uint8 permitV, bytes32 permitR, bytes32 permitS
    ) external {
        supply(3, supplyAsset, supplyAmount);
        borrowETHWithPermit(borrowAmount, borrowInterestRateMode,
            permitAmount, permitDeadline, permitV, permitR, permitS
        );
    }

    function repayAndWithdraw(uint version,
        address repayAsset, uint repayAmount, uint repayInterestRateMode,
        address withdrawalAsset, uint withdrawalAmount
    ) external {
        repay(version, repayAsset, repayAmount, repayInterestRateMode);
        withdraw(version, withdrawalAsset, withdrawalAmount);
    }

    function repayAndWithdrawWithPermit(uint version,
        address repayAsset, uint repayAmount, uint repayInterestRateMode,
        address withdrawalAsset, uint withdrawalAmount,
        uint permitAmount, uint permitDeadline, uint8 permitV, bytes32 permitR, bytes32 permitS
    ) external {
        repay(version, repayAsset, repayAmount, repayInterestRateMode);
        withdrawWithPermit(version, withdrawalAsset, withdrawalAmount,
            permitAmount, permitDeadline, permitV, permitR, permitS
        );
    }

    function repayETHAndWithdraw(uint version,
        uint repayAmount, uint repayInterestRateMode,
        address withdrawalAsset, uint withdrawalAmount
    ) payable external {
        repayETH(version, repayAmount, repayInterestRateMode);
        withdraw(version, withdrawalAsset, withdrawalAmount);
    }

    function repayAndWithdrawETH(uint version,
        address repayAsset, uint repayAmount, uint repayInterestRateMode,
        uint withdrawalAmount
    ) external {
        repay(version, repayAsset, repayAmount, repayInterestRateMode);
        withdrawETH(version, withdrawalAmount);
    }

    function repayETHAndWithdrawWithPermit(uint version,
        uint repayAmount, uint repayInterestRateMode,
        address withdrawalAsset, uint withdrawalAmount,
        uint permitAmount, uint permitDeadline, uint8 permitV, bytes32 permitR, bytes32 permitS
    ) payable external {
        repayETH(version, repayAmount, repayInterestRateMode);
        withdrawWithPermit(version, withdrawalAsset, withdrawalAmount,
            permitAmount, permitDeadline, permitV, permitR, permitS
        );
    }

    function repayAndWithdrawETHWithPermit(uint version,
        address repayAsset, uint repayAmount, uint repayInterestRateMode,
        uint withdrawalAmount,
        uint permitAmount, uint permitDeadline, uint8 permitV, bytes32 permitR, bytes32 permitS
    ) external {
        repay(version, repayAsset, repayAmount, repayInterestRateMode);
        withdrawETHWithPermit(version, withdrawalAmount,
            permitAmount, permitDeadline, permitV, permitR, permitS
        );
    }

    /**
    * @dev transfer ETH to an address, revert if it fails.
    * @param to recipient of the transfer
    * @param value the amount to send
    */
    function _safeTransferETH(address to, uint value) internal {
        (bool success, ) = to.call{value: value}(new bytes(0));
        require(success, 'ETH_TRANSFER_FAILED');
    }

    receive() external payable {}
}
