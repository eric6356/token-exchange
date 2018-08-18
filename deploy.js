#!/usr/bin/env node
const fs = require('fs')
const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')

const TokenFactoryABI = JSON.parse(fs.readFileSync('./build/contracts_EIP20Factory_sol_EIP20Factory.abi'))
const TokenFactoryData = fs.readFileSync('./build/contracts_EIP20Factory_sol_EIP20Factory.bin')
const TokenABI = JSON.parse(fs.readFileSync('./build/contracts_EIP20_sol_EIP20.abi'))
const TokenData = fs.readFileSync('./build/contracts_EIP20_sol_EIP20.bin')
const ExchangeABI = JSON.parse(fs.readFileSync('./build/contracts_Exchange_sol_Exchange.abi'))
const ExchangeData = fs.readFileSync('./build/contracts_Exchange_sol_Exchange.bin')

let coinbase, TokenFactoryContract, tokenFactory, ExchangeContract, exchange, accounts
let tokens = {}
const getToken = address => {
    const key = Object.keys(tokens).filter(key => tokens[key].options.address === address)[0]
    return tokens[key]
}

const deployed = {
    factory: null,
    tokens: [],
    exchange: null
}

const init = () => Promise.resolve()
    .then(() => web3.eth.getCoinbase())
    .then(res => coinbase = res)
    .then(() => web3.eth.getAccounts())
    .then(res => accounts = res)

const deployTokenFactory = () => Promise.resolve()
    .then(() => {
        TokenFactoryContract = new web3.eth.Contract(TokenFactoryABI, null, { from: coinbase, gas: 6721975 })
    })
    .then(() => console.group('Deploying tokenFactory...'))
    .then(() => TokenFactoryContract.deploy({ data: TokenFactoryData }).send())
    .then(i => {
        tokenFactory = i
        deployed.factory = i.options.address
        console.log(`tokenFactory deployed at: ${i.options.address}`)
        console.groupEnd()
    })

const tokenCreated = symbol => addr => {
    deployed.tokens.push(addr)
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
    .then(() => ExchangeContract.deploy({ data: ExchangeData, arguments: [deployed.factory] }).send())
    .then(i => {
        exchange = i
        deployed.exchange = i.options.address
        console.log(`exchange deployed at: ${i.options.address}`)
        console.groupEnd()
    })

const _initBalance = (symbol, account, balance) => () => Promise.resolve()
    .then(() => tokens[symbol].methods.transfer(account, balance).send())
    .then(() => tokens[symbol].methods.balances(account).call())
    .then(() => checkBalance(symbol, account))

const initBalance = () => Promise.resolve()
    .then(() => console.group('Init Balance...'))
    .then(_initBalance('TKA', accounts[1], 5000))
    .then(_initBalance('TKB', accounts[2], 5000))
    .then(_initBalance('TKC', accounts[3], 5000))
    .then(_initBalance('TKA', accounts[4], 100))
    .then(_initBalance('TKB', accounts[5], 200))
    .then(console.groupEnd)

const _initOffer = (account, offersSymbol, offersAmount, wantsSymbol, wantsAmount) => {
    console.log(`${account} wants ${wantsAmount} ${wantsSymbol} for ${offersAmount} ${offersSymbol}`)
    const offersToken = tokens[offersSymbol]
    const wantsToken = tokens[wantsSymbol]
    return offersToken.methods.approve(exchange.options.address, offersAmount).send({ from: account })
        .then(() => exchange.methods.initOffer(offersToken.options.address, offersAmount, wantsToken.options.address, wantsAmount).send({ from: account }))
}

const _checkAllowance = (symbol, from, to) => {
    return tokens[symbol].methods.allowed(from, to).call().then(console.log)
}

const _logLatestOffer = () => exchange.methods.offerCount().call()
    .then(i => exchange.methods.offers(i).call())
    .then(console.log)

const _acceptOffer = (account, offerId) => {
    console.log(`${account} accepting offer ${offerId}`)
    return exchange.methods.offers(offerId).call()
        .then(({ wants, wantsAmount }) => getToken(wants).methods.approve(exchange.options.address, wantsAmount).send({ from: account }))
        .then(() => exchange.methods.acceptOffer(offerId).send({ from: account }))
}

const checkBalance = (symbol, account) => tokens[symbol].methods.balances(account).call()
    .then(b => console.log(`${account} now has ${b} ${symbol}`))

const initOffer = () => Promise.resolve()
    .then(() => console.group('Init Offer...'))
    // TODO: do this from UI
    // .then(() => _initOffer(accounts[1], 'TKA', 1000, 'TKB', 2000))
    .then(() => _initOffer(accounts[2], 'TKB', 2000, 'TKC', 3000))
    .then(() => _initOffer(accounts[3], 'TKC', 3000, 'TKA', 1000))
    .then(() => _initOffer(accounts[4], 'TKA', 100, 'TKB', 200))
    // TODO: do this from UI
    // .then(() => _acceptOffer(accounts[5], 4))
    // .then(() => checkBalance('TKB', accounts[4]))
    // .then(() => checkBalance('TKA', accounts[5]))
    .then(console.groupEnd)

web3.eth.getCoinbase()
    .then(init)
    .then(deployTokenFactory)
    .then(createTokens)
    .then(initBalance)
    .then(deployExchange)
    .then(initOffer)
    .then(() => fs.writeFileSync('./deployed.json', JSON.stringify(deployed, '\n', 4)))
    .catch(console.error)
