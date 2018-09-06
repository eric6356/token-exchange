#!/usr/bin/env node
const fs = require('fs')
const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')
const cTable = require('console.table')

const TokenFactoryABI = JSON.parse(fs.readFileSync('./build/contracts_EIP20Factory_sol_EIP20Factory.abi'))
const TokenFactoryData = fs.readFileSync('./build/contracts_EIP20Factory_sol_EIP20Factory.bin')
const TokenABI = JSON.parse(fs.readFileSync('./build/contracts_EIP20_sol_EIP20.abi'))
const TokenData = fs.readFileSync('./build/contracts_EIP20_sol_EIP20.bin')
const ExchangeABI = JSON.parse(fs.readFileSync('./build/contracts_Exchange_sol_Exchange3.abi'))
const ExchangeData = fs.readFileSync('./build/contracts_Exchange_sol_Exchange3.bin')

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
        .then(console.group('Reading all balances...'))
        .then(() => Promise.all(balances.map(balance => _readAccountBalance({ balance }))))
        .then(() => console.table(balances))
        .then(console.groupEnd)
}

const init = () => Promise.resolve()
    .then(() => web3.eth.getCoinbase())
    .then(res => coinbase = res)
    .then(() => web3.eth.getAccounts())
    .then(res => accounts = res.slice(0, 5))

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

const _addAllowance = ({ token, tokenAddress, from, to, amount }) => {
    token = token || getToken(tokenAddress)
    return token.methods.allowance(from, to).call()
        .then(currentAllowance => token.methods.approve(to, parseInt(currentAllowance) + amount).send({ from }))
}

const _initBalance = (symbol, account, balance) => () => Promise.resolve()
    .then(() => tokens[symbol].methods.transfer(account, balance).send())
    .then(() => tokens[symbol].methods.balances(account).call())

const initBalance = () => Promise.resolve()
    .then(() => console.group('Init Balance...'))
    .then(_initBalance('TKA', accounts[1], 1000))
    .then(_initBalance('TKB', accounts[2], 2000))
    .then(_initBalance('TKC', accounts[3], 3000))
    .then(readAllBalance)
    .then(console.groupEnd)

const _initDelegation = (account, tokenSymbol, amount, ppm) => {
    console.log(`${account} initing delegation for ${amount} ${tokenSymbol} at ${ppm} ppm...`)
    const token = tokens[tokenSymbol].options.address
    return exchange.methods.initDelegation(token, amount, ppm).send({ from: account })
}

const _signDelegation = (account, delegationId) => {
    console.log(`${account} signing delegation ${delegationId}`)
    let totalDelegationAmount
    let tokenContract
    return exchange.methods.delegations(delegationId).call()
        .then(({ token, totalAmount }) => {
            tokenContract = getToken(token)
            totalDelegationAmount = totalAmount
        })
        .then(() => tokenContract.methods.allowance(account, exchange.options.address).call())
        .then(currentAllowance => tokenContract.methods.approve(exchange.options.address, parseInt(currentAllowance) + totalDelegationAmount).send({ from: account }))
        .then(() => exchange.methods.signDelegation(delegationId).send({ from: account }))
}

const _initDelegatedOffer = (account, delegationId, amount, wantsSymbol, wantsAmount) => {
    const wants = tokens[wantsSymbol].options.address
    console.log(`${account} initing delegated offer, amount: ${amount}, wants ${wantsAmount} ${wantsSymbol}`)
    return exchange.methods.initDelegatedOffer(delegationId, amount, wants, wantsAmount).send({ from: account })
}

const _acceptDelegatedOffer = (account, offerId) => {
    console.log(`${account} accepting delegated offer ${offerId}`)
    // return exchange.methods.delegatedOfferCount().call()
    // .then(c => { console.log(c); return c })
    // .then(() => exchange.methods.delegatedOffers(offerId).call())
    return exchange.methods.delegatedOffers(offerId).call()
        .then(({ wants, wantsAmount }) => _addAllowance({ tokenAddress: wants, from: account, to: exchange.options.address, amount: wantsAmount }))
        .then(() => exchange.methods.acceptDelegatedOffer(offerId).send({ from: account }))
}

const readAllOffer = () => {
    const offers = []
    return Promise.resolve()
        .then(() => console.group('Reading all offers...'))
        .then(() => exchange.methods.delegatedOfferCount().call())
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
    return exchange.methods.delegatedOffers(id).call()
        .then(({ offers, offersAmount, wants, wantsAmount, acceptor }) => {
            offer.offers = getTokenSymbol(offers)
            offer.offersAmount = offersAmount
            offer.wants = getTokenSymbol(wants)
            offer.wantsAmount = wantsAmount
            offer.acceptor = acceptor
        })
}

const readAllDelegation = () => {
    const delegations = []
    return Promise.resolve()
        .then(() => console.group('Reading all delegations...'))
        .then(() => exchange.methods.delegationCount().call())
        .then(c => Promise.all(Array.from(Array(parseInt(c)).keys()).map(
            x => exchange.methods.delegations(x + 1).call()
                .then(({ id, agent, token, totalAmount, currentAmount, ppm, client }) => {
                    delegations.push({ id, agent, token: getTokenSymbol(token), tAmount: totalAmount, cAmount: currentAmount, ppm, client })
                })
        )))
        .then(() => console.table(delegations))
        .then(console.groupEnd)
}

const delegation = () => Promise.resolve()
    .then(() => console.group('Running...'))
    .then(() => _initDelegation(accounts[4], 'TKA', 1000, 5000))
    .then(() => _signDelegation(accounts[1], 1))
    .then(readAllDelegation)
    .then(console.groupEnd)

const offer = () => Promise.resolve()
    .then(() => console.group('Offer...'))
    .then(() => _initDelegatedOffer(accounts[4], 1, 500, 'TKB', 2000))
    .then(() => _initDelegatedOffer(accounts[4], 1, 500, 'TKC', 3000))
    .then(() => _acceptDelegatedOffer(accounts[2], 1))
    .then(() => _acceptDelegatedOffer(accounts[3], 2))
    .then(readAllOffer)
    .then(readAllDelegation)
    .then(readAllBalance)
    .then(console.groupEnd)

Promise.resolve()
    .then(init)
    .then(deployTokenFactory)
    .then(createTokens)
    .then(initBalance)
    .then(deployExchange)
    .then(delegation)
    .then(offer)
    .then(() => fs.writeFileSync('./deployed.3.json', JSON.stringify(deployed, '\n', 4)))
    .catch(console.error)
