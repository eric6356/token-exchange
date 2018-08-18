pragma solidity ^0.4.21;

import "./EIP20.sol";
import "./EIP20Factory.sol";

contract Exchange {
    EIP20Factory factory;
    mapping(uint => Offer) public offers;
    uint public offerCount;

    struct Offer {
        uint id;
        address initiator;
        address offers;
        uint offersAmount;
        address wants;
        uint wantsAmount;
        address acceptor;
    }

    constructor(EIP20Factory _factory) public {
        factory = _factory;
    }

    function initOffer(address _offers, uint _offersAmount, address _wants, uint _wantsAmount) public {
        // TODO: require isEIP20(_offers) && isEIP20(_wants)
        offerCount++;
        Offer memory o = Offer(offerCount, msg.sender, _offers, _offersAmount, _wants, _wantsAmount, address(0));
        offers[offerCount] = o;
    }

    function acceptOffer(uint _offerId) public {
        Offer storage o = offers[_offerId];
        require(o.acceptor == address(0), "offer already accepted");
        EIP20 offersToken = factory.tokens(o.offers);
        EIP20 wantsToken = factory.tokens(o.wants);
        // FIXME: check allowance
        offersToken.transferFrom(o.initiator, address(this), o.offersAmount);
        offersToken.transfer(msg.sender, o.offersAmount);
        wantsToken.transferFrom(msg.sender, address(this), o.wantsAmount);
        wantsToken.transfer(o.initiator, o.wantsAmount);
        o.acceptor = msg.sender;
    }
}