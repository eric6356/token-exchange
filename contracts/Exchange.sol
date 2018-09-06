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
contract Exchange2 {
    EIP20Factory factory;
    mapping(uint => Offer) public offers;
    uint public offerCount;

    struct Offer {
        uint id;
        uint sellerCount;
        address sellingToken;
        uint totalSellAmount;
        uint currentSellAmount;
        uint buyerCount;
        address buyingToken;
        uint totalBuyAmount;
        uint currentBuyAmount;
        mapping(uint => address) sellers;
        mapping(uint => uint) sellersAmount;
        mapping(uint => address) buyers;
        mapping(uint => uint) buyersAmount;
    }

    constructor(EIP20Factory _factory) public {
        factory = _factory;
    }

    function getSeller(uint _offerId, uint _sellerId) public view returns (address) {
        return offers[_offerId].sellers[_sellerId];
    }

    function getSellersAmount(uint _offerId, uint _sellerId) public view returns (uint) {
        return offers[_offerId].sellersAmount[_sellerId];
    }

    function getBuyer(uint _offerId, uint _buyerId) public view returns (address) {
        return offers[_offerId].buyers[_buyerId];
    }

    function getBuyersAmount(uint _offerId, uint _buyerId) public view returns (uint) {
        return offers[_offerId].buyersAmount[_buyerId];
    }

    function initOffer(address _sellingToken, uint _totalSellAmount, address _buyingToken, uint _totalBuyAmount) public {
        // TODO: require isEIP20(_sellingToken) && isEIP20(_buyingToken)
        offerCount++;
        Offer memory o = Offer(
            offerCount,
            0,
            _sellingToken,
            _totalSellAmount,
            0,
            0,
            _buyingToken,
            _totalBuyAmount,
            0
        );
        offers[offerCount] = o;
    }

    function addSeller(uint _offerId, uint _amount) public {
        Offer storage o = offers[_offerId];
        require(o.currentSellAmount + _amount <= o.totalSellAmount, "amount too large");
        // FIXME: check allowance
        o.sellerCount++;
        o.sellers[o.sellerCount] = msg.sender;
        o.sellersAmount[o.sellerCount] = _amount;
        o.currentSellAmount += _amount;
        tryToSettle(o);
    }

    function addBuyer(uint _offerId, uint _amount) public {
        Offer storage o = offers[_offerId];
        require(o.currentBuyAmount + _amount <= o.totalBuyAmount, "amount too large");
        // FIXME: check allowance
        o.buyerCount++;
        o.buyers[o.buyerCount] = msg.sender;
        o.buyersAmount[o.buyerCount] = _amount;
        o.currentBuyAmount += _amount;
        tryToSettle(o);
    }

    function tryToSettle(Offer storage _o) private {
        if (_o.currentSellAmount != _o.totalSellAmount || _o.currentBuyAmount != _o.totalBuyAmount) {
            return;
        }
        EIP20 sellingToken = factory.tokens(_o.sellingToken);
        EIP20 buyingToken = factory.tokens(_o.buyingToken);
        uint id;
        uint income;
        for (id = 1; id <= _o.sellerCount; id++) {
            address seller = _o.sellers[id];
            sellingToken.transferFrom(seller, address(this), _o.sellersAmount[id]);
        }
        for (id = 1; id <= _o.buyerCount; id++) {
            address buyer = _o.buyers[id];
            buyingToken.transferFrom(buyer, address(this), _o.buyersAmount[id]);
            income = _o.buyersAmount[id] * _o.totalSellAmount / _o.totalBuyAmount;
            sellingToken.transfer(buyer, income);
        }
        for (id = 1; id <= _o.sellerCount; id++) {
            income = _o.sellersAmount[id] * _o.totalBuyAmount / _o.totalSellAmount;
            buyingToken.transfer(seller, income);
        }
    }
}
