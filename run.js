#!/usr/bin/env node
const fs = require('fs')
const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')
const cTable = require('console.table')

const TokenFactoryABI = JSON.parse(fs.readFileSync('./build/contracts_EIP20Factory_sol_EIP20Factory.abi'))
const TokenFactoryData = fs.readFileSync('./build/contracts_EIP20Factory_sol_EIP20Factory.bin')
const TokenABI = JSON.parse(fs.readFileSync('./build/contracts_EIP20_sol_EIP20.abi'))
const TokenData = fs.readFileSync('./build/contracts_EIP20_sol_EIP20.bin')
const ExchangeABI = JSON.parse(fs.readFileSync('./build/contracts_Exchange_sol_Exchange.abi'))
const ExchangeData = fs.readFileSync('./build/contracts_Exchange_sol_Exchange.bin')

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
        _readTokenBalance({ symbol: 'TKC', account, balance }),
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
    .then(res => accounts = res.slice(0, 6))

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
    .then(() => tokenFactory.methods.createEIP20(1000000, 'Token C', 1, 'TKC').send())
    .then(() => tokenFactory.methods.created(3).call())
    .then(tokenCreated('TKC'))
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
    .then(_initBalance('TKA', accounts[1], 5000))
    .then(_initBalance('TKB', accounts[2], 5000))
    .then(_initBalance('TKC', accounts[3], 5000))
    .then(_initBalance('TKA', accounts[4], 100))
    .then(_initBalance('TKB', accounts[5], 200))
    .then(readAllBalance)
    .then(console.groupEnd)

const _initOffer = (account, offersSymbol, offersAmount, wantsSymbol, wantsAmount) => {
    // console.log(`${account} wants ${wantsAmount} ${wantsSymbol} for ${offersAmount} ${offersSymbol}`)
    const offersToken = tokens[offersSymbol]
    const wantsToken = tokens[wantsSymbol]
    return offersToken.methods.allowance(account, exchange.options.address).call()
        .then(currentAllowance => offersToken.methods.approve(exchange.options.address, parseInt(currentAllowance) + offersAmount).send({ from: account }))
        .then(() => exchange.methods.initOffer(offersToken.options.address, offersAmount, wantsToken.options.address, wantsAmount).send({ from: account }))
        .then(() => exchange.methods.offerCount().call())
}

const readAllOffer = () => {
    const offers = []
    return Promise.resolve()
        .then(() => console.group('Reading all offer...'))
        .then(() => exchange.methods.offerCount().call())
        .then(c => Promise.all(Array.from(Array(parseInt(c)).keys()).map(x => {
            const offer = { id: x + 1 }
            offers.push(offer)
            return _readOfferById({ offer })
        })))
        .then(() => console.table(offers))
        .then(console.groupEnd)
}

const _readOfferById = ({ offer }) => {
    const { id } = offer
    return exchange.methods.offers(id).call()
        .then(({ initiator, offers, offersAmount, wants, wantsAmount, acceptor }) => {
            offer.initiator = initiator
            offer.offers = getTokenSymbol(offers)
            offer.offersAmount = offersAmount
            offer.wants = getTokenSymbol(wants)
            offer.wantsAmount = wantsAmount
            offer.acceptor = acceptor
        })
}

const _checkAllowance = (symbol, from, to) => {
    return tokens[symbol].methods.allowed(from, to).call().then(console.log)
}

const _logLatestOffer = () => exchange.methods.offerCount().call()
    .then(i => exchange.methods.offers(i).call())
    .then(console.log)

const _acceptOffer = (account, offerId) => {
    console.log(`${account} accepting offer ${offerId}`)
    let token
    let amount
    return exchange.methods.offers(offerId).call()
        .then(({ wants, wantsAmount }) => {
            token = getToken(wants)
            amount = wantsAmount
        })
        .then(() => token.methods.allowance(account, exchange.options.address).call())
        .then(currentAllowance => token.methods.approve(exchange.options.address, amount + parseInt(currentAllowance)).send({ from: account }))
        .then(() => exchange.methods.acceptOffer(offerId).send({ from: account }))
}

const checkBalance = (symbol, account) => tokens[symbol].methods.balances(account).call()
    .then(b => console.log(`${account} now has ${b} ${symbol}`))

const initOffer = () => Promise.resolve()
    .then(() => console.group('Init Offer...'))
    // TODO: do this from UI
    .then(() => _initOffer(accounts[1], 'TKA', 1000, 'TKB', 2000))
    .then(() => _initOffer(accounts[2], 'TKB', 2000, 'TKC', 3000))
    .then(() => _initOffer(accounts[3], 'TKC', 3000, 'TKA', 1000))
    .then(() => _initOffer(accounts[4], 'TKA', 100, 'TKB', 200))
    .then(readAllOffer)
    // TODO: do this from UI
    .then(() => _acceptOffer(accounts[5], 4))
    .then(readAllBalance)
    .then(readAllOffer)
    // .then(() => checkBalance('TKB', accounts[4]))
    // .then(() => checkBalance('TKA', accounts[5]))
    .then(console.groupEnd)

Promise.resolve()
    .then(init)
    .then(deployTokenFactory)
    .then(createTokens)
    .then(initBalance)
    .then(deployExchange)
    .then(initOffer)
    .then(() => fs.writeFileSync('./deployed.json', JSON.stringify(deployed, '\n', 4)))
    .catch(console.error)
