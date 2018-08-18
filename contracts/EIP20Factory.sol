pragma solidity ^0.4.21;

import "./EIP20.sol";

contract EIP20Factory {

    mapping(uint => address) public created;
    mapping(address => EIP20) public tokens;
    mapping(address => bool) public isEIP20;
    uint public count;

    function createEIP20(uint256 _initialAmount, string _name, uint8 _decimals, string _symbol)
        public
    returns (address) {
        EIP20 newToken = (new EIP20(_initialAmount, _name, _decimals, _symbol));
        count++;
        created[count] = address(newToken);
        tokens[address(newToken)] = newToken;
        isEIP20[address(newToken)] = true;
        //the factory will own the created tokens. You must transfer them.
        newToken.transfer(msg.sender, _initialAmount);
        return address(newToken);
    }

}
