import { ethers, Contract } from "ethers"

import ZooToken from '../../hardhat/artifacts/contracts/ZooToken.sol/ZooToken.json'

;(function(){

  window.rarityTable = {
    1000: 'COMMON',
    100: 'RARE',
    10: 'EPIC',
    1: 'LEGENDARY'
  }

  window.breedTimeouts = {
    0: { days: 0, hours: 0},
    1: { days: 0, hours: 4 },
    2: { days: 1, hours: 0 },
    3: { days: 3, hours: 0 },
    4: { days: 7, hours: 0 },
    5: { days: 28, hours: 0 }
  }

  window.eggTimeout = { days: 1, hours: 12 }

  window.getMilliseconds = ({days, hours}) => {
    const total = (days * 24) + hours
    return total * 3600000
  }

  window.getDaysHours = (milliseconds) => {
    const total = Math.floor(milliseconds / 3600000),
      days = Math.floor(total / 24),
      hours = total % 24

    return { days, hours }
  }

  window.getServerTime = () => {
    const now = (new Date()).getTime(),
      timePassed = now - window.initialClientTime

    return window.initialServerTime + timePassed
  }

  window.cloudinaryImgURL = (_basename, name) => {
    let basename
    switch (_basename) {
      case 'Duckling':
        basename = 'Duck'
        break;
      case 'Kitten':
        basename = 'Kittens'
        break;
      case 'Pug':
        basename = 'Pugs'
        break;
      default:
        basename = _basename;
    }
    return `http://res.cloudinary.com/htcif1pyx/image/upload/w_600/v1/CryptoZoo/9:16%20Aspect%20Ratio/${encodeURIComponent(basename)}/${encodeURIComponent(name)}.jpg`
  }

  class ConfirmBox {
    constructor(txt, resolve){
      this.elem = document.createElement('div')
      this.elem.className = 'modal dialog-box'
      this.resolveFn = resolve
      this.elem.innerHTML = `
        <h3>${txt}</h3>
        <div style="display: flex;">
          <a class="formbutton">Yes</a>
          <a class="formbutton" style="margin-left: 10px;">No</a>
        </div>
        <div class="modal-close"></div>
      `

      const closeButton = this.elem.querySelector('.modal-close')
      if(closeButton){
        closeButton.addEventListener('click', () => {
          this.resolveFn(null)
          this.close()
        })
      }

      const submitButtons = this.elem.querySelectorAll('.formbutton')
      submitButtons[0].addEventListener('click', () => {
        this.resolveFn(true)
        this.close()
      })
      submitButtons[1].addEventListener('click', () => {
        this.resolveFn(null)
        this.close()
      })

      document.body.appendChild(this.elem)
    }
    close(){
      this.elem.remove()
    }
  }

  window.quickConfirm = (txt) => {
    return new Promise(resolve => {
      new ConfirmBox(txt, resolve)
    })
  }

  class DialogBox {
    constructor(txt, fields, resolve, cta = "Submit"){ // fields { name: type, }
      this.elem = document.createElement('div')
      this.elem.className = 'modal dialog-box'
      this.fieldNames = Object.keys(fields)
      this.resolveFn = resolve
      this.elem.innerHTML = `
        <h3>${txt}</h3>
        ${this.fieldNames.map(fieldName => {
          const obj = fields[fieldName],
            type = obj.type || 'text',
            defaultval = obj.default ? `value="${obj.default}"` : ''
          return `
          <div class="formfield">
            <label>${obj.label || fieldName}</label>
            <input name="${fieldName}" type="${type}" ${defaultval} />
          </div>
        `}).join('')}
        <a class="formbutton">${cta}</a>
        <div class="modal-close"></div>
      `

      const closeButton = this.elem.querySelector('.modal-close')
      if(closeButton){
        closeButton.addEventListener('click', () => {
          this.resolveFn(null)
          this.close()
        })
      }

      const submitButton = this.elem.querySelector('.formbutton')
      submitButton.addEventListener('click', () => {
        const data = this.fieldNames.reduce((obj, fieldName) => {
          const val = this.elem.querySelector(`[name="${fieldName}"]`).value
          obj[fieldName] = val
          return obj
        }, {})

        this.resolveFn(data)
        this.close()
      })

      document.body.appendChild(this.elem)
    }
    close(){
      this.elem.remove()
    }
  }

  window.quickFormPromise = (txt, fields, cta) => {
    return new Promise(resolve => {
      new DialogBox(txt, fields, resolve, cta)
    })
  }

  //Endpoint manager
  class _EndpointManager {
    constructor(){
      this.endpoints = {}
    }

    //private methods
    async _handleResponse(response){
      if (!response.ok) {
        return {
          error: {
            status: response.status,
            message: response.statusText
          }
        }
      } else {
        const resp = await response.json()
        let obj
        if(typeof resp === "object") obj = resp
        else obj = JSON.parse(resp)

        return obj;
      }
    }

    //public methods
    async delete(url, data){
      const body = typeof data === "string" ? data : JSON.stringify(data),
        response = await fetch(url, {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        cache: 'no-cache',
        body
      })
      return this._handleResponse(response)
    }

    async get(url){
      const response = await fetch(url)
      return this._handleResponse(response)
    }

    async post(url, data = ""){
      const body = typeof data === "string" ? data : JSON.stringify(data),
        response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        cache: 'no-cache',
        body
      })
      return this._handleResponse(response)
    }

    async put(url, data){
      const body = typeof data === "string" ? data : JSON.stringify(data),
        response = await fetch(url, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        cache: 'no-cache',
        body
      })
      return this._handleResponse(response)
    }

    getParameterizedEndpoint(name, data){
      const url = this.endpoints[name].urlBuilder(data)
      return this.get(url)
    }

    registerParameterizedEndpoint(name, urlBuilder){
      this.endpoints[name] = {
        urlBuilder
      }
    }
  }

  window.EndpointManager = new _EndpointManager()

  window.modals = {}

  class WaitButton {
    constructor(elem){
      this.elem = elem
    }
    start(){
      this.originalText = this.elem.textContent
      let i = 0
      const dots = '...'

      this.renderInterval = window.setInterval(() => {
        ++i
        this.elem.textContent = `Wait${dots.slice(0,i)}`
        if(i === 3) i = 0
      }, 300)
    }
    stop(){
      window.clearInterval(this.renderInterval)
      this.elem.textContent = this.originalText
    }
  }

  window.waitButton = WaitButton

  class Modal {
    constructor(elem){
      this.elem = elem
      this.name = this.elem.dataset.modalName

      window.modals[this.name] = this

      document.querySelectorAll(`.modal-trigger[data-modal-name="${this.name}"]`).forEach(elem => {
        elem.addEventListener('click', () => this.open())
      })

      const closeButton = this.elem.querySelector('.modal-close')
      if(closeButton){
        closeButton.addEventListener('click', () => this.close())
      }
    }
    close(){
      this.elem.classList.add('hidden')
    }
    open(){
      this.elem.classList.remove('hidden')
    }
  }

  async function connectWallet () {
    console.log('connectWallet')
    if (!window.ethereum) {
      return {
        success: false,
        address: "",
        status: `
          <span>
            <p>
              <a target="_blank" rel="noreferrer" href="https://metamask.io/download.html">
                Please install Metamask, a virtual Ethereum wallet, in your
                browser.
              </a>
            </p>
          </span>`
      }
    }

    try {
      console.log('getting provider')
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()

      const accounts = await provider.send('eth_requestAccounts', [])
      const address  = await signer.getAddress()

      console.log('accounts', accounts)
      console.log('address', address)

      return {
        success: true,
        status: "Wallet Connected.",
        address: address,
        provider: provider,
        signer: signer,
      }
    } catch (err) {
      return {
        success: false,
        address: "",
        status: "😥 " + err.message
      }
    }
  }

  window.metamaskLogin = async () => {
    const wallet = await connectWallet()

    // Bail out if we can't connect to wallet
    if (!wallet.success) {
      window.quickFormPromise(wallet.status, {}, 'Ok')
      return null
    }

    // Zoo Token
    const tokenAddress = '0x8e7788ee2b1d3e5451e182035d6b2b566c2fe997';
    const tokenAbi = ZooToken.abi

    const web3Status    = wallet.status
    const contract      = new Contract(tokenAddress, tokenAbi, wallet.provider)
    const balance       = await contract.balanceOf(wallet.address)
    const symbol        = await contract.symbol()
    const name          = await contract.name()
    const contractOwner = await contract.owner()

    console.log('symbol', symbol, 'name', name, 'contractOwner', contractOwner, 'balance', balance, 'wallet.address', wallet.address)

    // TODO: Remove backend code
    const existingRecord = await fetch(`/users/${wallet.address}`).then(resp => resp.json())

    let userdata;
    if (existingRecord && existingRecord.user) {
      userdata = existingRecord.user
    } else {
      const newUserData = await window.EndpointManager.post('/users/registermm', { mmid: wallet.address })
      userdata = newUserData.user
    }

    localStorage.czUser = JSON.stringify(userdata)

    // Logged in
    location.href = '/feed'

    return {
      balance,
      symbol,
      name,
      contractOwner,
      web3Status
    }
  }

  //forms
  const formCallbacks = {
    login: function(data){
      console.log(data)
      window.modals.login.close()
      localStorage.czUser = JSON.stringify(data.user)
      location.href = '/feed'
    },
    register: function(data){
      window.modals.register.close()
      localStorage.czUser = JSON.stringify(data.user)
      location.href = '/feed'
    }
  }

  class Form {
    constructor(elem){
      this.elem = elem
      this.action = elem.dataset.action
      this.method = elem.dataset.method
      this.callback = formCallbacks[elem.dataset.cbKey]

      this.elem.querySelector('.formbutton').addEventListener('click', () => {
        let isOK = true
        const data = Array.from(this.elem.querySelectorAll('.formfield input')).reduce((obj, field) => {
          const val = field.value.trim()
          if(!val.length && field.required) {
            isOK = false
          }
          obj[field.name] = val
          return obj
        }, {})

        if(isOK){
          window.EndpointManager[this.method.toLowerCase()](this.action, data).then(resp => {
            if(resp.error) {
              alert(resp.error)
            } else {
              this.callback(resp)
            }
          })
        }
      })
    }
  }

  document.querySelectorAll('.modal').forEach(elem => new Modal(elem))

  document.querySelectorAll('.js-form').forEach(elem => new Form(elem))
}());
