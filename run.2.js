#!/usr/bin/env node
const fs = require('fs')
const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')
const cTable = require('console.table')

const TokenFactoryABI = JSON.parse(fs.readFileSync('./build/contracts_EIP20Factory_sol_EIP20Factory.abi'))
const TokenFactoryData = fs.readFileSync('./build/contracts_EIP20Factory_sol_EIP20Factory.bin')
const TokenABI = JSON.parse(fs.readFileSync('./build/contracts_EIP20_sol_EIP20.abi'))
const TokenData = fs.readFileSync('./build/contracts_EIP20_sol_EIP20.bin')
const ExchangeABI = JSON.parse(fs.readFileSync('./build/contracts_Exchange_sol_Exchange2.abi'))
const ExchangeData = fs.readFileSync('./build/contracts_Exchange_sol_Exchange2.bin')

let coinbase, TokenFactoryContract, tokenFactory, ExchangeContract, exchange, accounts
let tokens = {}
const getTokenSymbol = address => Object.keys(tokens).filter(key => tokens[key].options.address === address)[0]
const getToken = address => tokens[getTokenSymbol(address)]

const deployed = {
    factory: { abi: TokenFactoryABI, data: TokenFactoryData, address: null },
    tokens: { abi: TokenABI, data: TokenData, address: [] },
    exchange: { abi: ExchangeABI, data: ExchangeData, address: null }
}

const _readTokenBalance = ({ symbol, balance }) => {
    const { account } = balance
    return tokens[symbol].methods.balances(account).call()
        .then(b => {
            balance[symbol] = b
        })
}

const _readAccountBalance = ({ balance }) => {
    const { account } = balance
    return Promise.all([
        _readTokenBalance({ symbol: 'TKA', account, balance }),
        _readTokenBalance({ symbol: 'TKB', account, balance }),
        // _readTokenBalance({ symbol: 'TKC', account, balance }),
    ])
}

const readAllBalance = () => {
    const balances = accounts.slice(1).map(account => ({ account }))
    return Promise.resolve()
        .then(console.group('Reading all balance...'))
        .then(() => Promise.all(balances.map(balance => _readAccountBalance({ balance }))))
        .then(() => console.table(balances))
        .then(console.groupEnd)
}

const init = () => Promise.resolve()
    .then(() => web3.eth.getCoinbase())
    .then(res => coinbase = res)
    .then(() => web3.eth.getAccounts())
    .then(res => accounts = res.slice(0, 4))

const deployTokenFactory = () => Promise.resolve()
    .then(() => {
        TokenFactoryContract = new web3.eth.Contract(TokenFactoryABI, null, { from: coinbase, gas: 6721975 })
    })
    .then(() => console.group('Deploying tokenFactory...'))
    .then(() => TokenFactoryContract.deploy({ data: TokenFactoryData }).send())
    .then(i => {
        tokenFactory = i
        deployed.factory.address = i.options.address
        console.log(`tokenFactory deployed at: ${i.options.address}`)
        console.groupEnd()
    })

const tokenCreated = symbol => addr => {
    deployed.tokens.address.push(addr)
    tokens[symbol] = new web3.eth.Contract(TokenABI, addr, { from: coinbase, gas: 6721975 })
    // tokens[symbol].events.Approval(console.log)
    console.log(`${symbol} deployed at: ${addr}`)
}


const createTokens = () => Promise.resolve()
    .then(() => console.group('Creating tokens...'))
    .then(() => tokenFactory.methods.createEIP20(1000000, 'Token A', 1, 'TKA').send())
    .then(() => tokenFactory.methods.created(1).call())
    .then(tokenCreated('TKA'))
    .then(() => tokenFactory.methods.createEIP20(1000000, 'Token B', 1, 'TKB').send())
    .then(() => tokenFactory.methods.created(2).call())
    .then(tokenCreated('TKB'))
    // .then(() => tokenFactory.methods.createEIP20(1000000, 'Token C', 1, 'TKC').send())
    // .then(() => tokenFactory.methods.created(3).call())
    // .then(tokenCreated('TKC'))
    .then(console.groupEnd)

const deployExchange = () => Promise.resolve()
    .then(() => {
        ExchangeContract = new web3.eth.Contract(ExchangeABI, null, { from: coinbase, gas: 6721975 })
    })
    .then(() => console.group('Deploying exchange...'))
    .then(() => ExchangeContract.deploy({ data: ExchangeData, arguments: [deployed.factory.address] }).send())
    .then(i => {
        exchange = i
        deployed.exchange.address = i.options.address
        console.log(`exchange deployed at: ${i.options.address}`)
        console.groupEnd()
    })

const _initBalance = (symbol, account, balance) => () => Promise.resolve()
    .then(() => tokens[symbol].methods.transfer(account, balance).send())
    .then(() => tokens[symbol].methods.balances(account).call())
// .then(() => checkBalance(symbol, account))

const initBalance = () => Promise.resolve()
    .then(() => console.group('Init Balance...'))
    .then(_initBalance('TKA', accounts[1], 1000))
    .then(_initBalance('TKB', accounts[2], 500))
    .then(_initBalance('TKB', accounts[3], 1500))
    .then(readAllBalance)
    .then(console.groupEnd)

const _initOffer = (sellingSymbol, totalSellAmount, buyingSymbol, totalBuyAmount) => {
    const sellToken = tokens[sellingSymbol].options.address
    const buyToken = tokens[buyingSymbol].options.address
    return exchange.methods.initOffer(sellToken, totalSellAmount, buyToken, totalBuyAmount).send()
}

const readAllOffer = () => {
    const offers = []
    return Promise.resolve()
        .then(() => console.group('Reading all offer...'))
        .then(() => exchange.methods.offerCount().call())
        .then(c => Promise.all(Array.from(Array(parseInt(c)).keys()).map(x => _readOfferById({ offers, id: x + 1 }))))
        .then(() => console.table(offers))
        .then(console.groupEnd)
}

const _readOfferById = ({ offers, id }) => {
    return exchange.methods.offers(id).call()
        .then(({ sellerCount, sellingToken, totalSellAmount, currentSellAmount, buyerCount, buyingToken, totalBuyAmount, currentBuyAmount }) => {
            const offer = { id, selling: getTokenSymbol(sellingToken), tSell: totalSellAmount, cSell: currentSellAmount, buying: getTokenSymbol(buyingToken), tBuy: totalBuyAmount, cBuy: currentBuyAmount }
            offers.push(offer)
            offer.sellers = []  // Array.from(Array(parseInt(sellerCount)).keys()).map(() => ({}))
            offer.buyers = [] // Array.from(Array(parseInt(buyerCount)).keys()).map(() => ({}))

            return Promise.all([
                _readOfferSellersOrBuyers({ offer, id, sellerCount }),
                _readOfferSellersOrBuyers({ offer, id, buyerCount })
            ])
                .then(() => {
                    offer.sellers = offer.sellers.join(', ')
                    offer.buyers = offer.buyers.join(', ')
                })
        })
}

const _readOfferSellersOrBuyers = ({ offer, id, sellerCount, buyerCount }) => {
    let count = sellerCount === undefined ? buyerCount : sellerCount
    const accountGetter = sellerCount === undefined ? exchange.methods.getBuyer : exchange.methods.getSeller
    const amountGetter = sellerCount === undefined ? exchange.methods.getBuyersAmount : exchange.methods.getSellersAmount
    const result = sellerCount === undefined ? offer.buyers : offer.sellers
    count = parseInt(count)
    return Promise.all(Array.from(Array(count).keys()).map(x => {
        let account
        return Promise.all([
            accountGetter(id, x + 1).call().then(s => { account = s }),
            amountGetter(id, x + 1).call().then(amount => result.push(`${account}: ${amount}`))
        ])
    }))
}

const _checkAllowance = (symbol, from, to) => {
    return tokens[symbol].methods.allowed(from, to).call().then(console.log)
}

const _addSeller = (account, offerId, amount) => {
    console.log(`adding ${account} to offer ${offerId}, selling ${amount}`)
    let token
    return exchange.methods.offers(offerId).call()
        .then(({ sellingToken }) => { token = getToken(sellingToken) })
        .then(() => token.methods.allowance(account, exchange.options.address).call())
        .then(currentAllowance => token.methods.approve(exchange.options.address, amount + parseInt(currentAllowance)).send({ from: account }))
        .then(() => exchange.methods.addSeller(offerId, amount).send({ from: account }))
}

const _addBuyer = (account, offerId, amount) => {
    console.log(`adding ${account} to offer ${offerId}, buying ${amount}`)
    let token
    return exchange.methods.offers(offerId).call()
        .then(({ buyingToken }) => { token = getToken(buyingToken) })
        .then(() => token.methods.allowance(account, exchange.options.address).call())
        .then(currentAllowance => token.methods.approve(exchange.options.address, amount + parseInt(currentAllowance)).send({ from: account }))
        .then(() => exchange.methods.addBuyer(offerId, amount).send({ from: account }))
}


const initOffer = () => Promise.resolve()
    .then(() => console.group('Init Offer...'))
    .then(() => _initOffer('TKA', 1000, 'TKB', 2000))
    .then(readAllOffer)
    .then(() => _addSeller(accounts[1], 1, 1000))
    .then(() => _addBuyer(accounts[2], 1, 500))
    .then(() => _addBuyer(accounts[3], 1, 1500))
    .then(readAllOffer)
    .then(readAllBalance)
    .then(console.groupEnd)

Promise.resolve()
    .then(init)
    .then(deployTokenFactory)
    .then(createTokens)
    .then(initBalance)
    .then(deployExchange)
    .then(initOffer)
    .then(() => fs.writeFileSync('./deployed.2.json', JSON.stringify(deployed, '\n', 4)))
    .catch(console.error)
