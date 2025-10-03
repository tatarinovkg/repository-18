const tg = window.Telegram ? window.Telegram.WebApp : null
const apiBaseUrl = 'https://bot.ovimex72.ru/api/'
let selectedGroupId = null

function initTelegram(){
  if(!tg) return
  try{
    tg.ready()
    tg.expand()
    tg.MainButton.setParams({
    text: 'Закрыть приложение',
    is_visible: true
  })
    tg.MainButton.onClick(() => tg.close())
    tg.MainButton.show()
  }catch(e){}
}

function updateThemeIcon(){
  const isDark = document.documentElement.classList.contains('dark')
  document.getElementById('themeIcon').textContent = isDark ? '☀️' : '🌙'
}

function toggleTheme(){
  const isDark = !document.documentElement.classList.contains('dark')
  document.documentElement.classList.toggle('dark', isDark)
  try{ localStorage.setItem('theme', isDark ? 'dark' : 'light'); localStorage.setItem('themeOverride','user') }catch(e){}
  updateThemeIcon()
}

function bootTheme(){
  try{
    const override = localStorage.getItem('themeOverride')
    const saved = localStorage.getItem('theme')
    if(override === 'user' && saved){
      document.documentElement.classList.toggle('dark', saved === 'dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
    }
  }catch(e){}
  updateThemeIcon()
}

function el(id){ return document.getElementById(id) }

function showError(fieldId, errorId, message){
  const field = el(fieldId)
  const error = el(errorId)
  if(field) field.classList.add('ring-2','ring-red-500')
  if(error){ error.textContent = message; error.classList.remove('hidden') }
}
function hideError(fieldId, errorId){
  const field = el(fieldId)
  const error = el(errorId)
  if(field) field.classList.remove('ring-2','ring-red-500')
  if(error) error.classList.add('hidden')
}

function bindEnterBlur(id){
  const node = el(id)
  if(!node) return
  node.addEventListener('keydown', (event) => {
    if(event.key === 'Enter'){
      event.preventDefault()
      node.blur()
    }
  })
}

async function fetchGroups(){
  try{
    const r = await fetch(
    apiBaseUrl + 'groups',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
    const groups = await r.json()
    const list = el('groupDropdown')
    list.innerHTML = ''
    groups.forEach(g => {
      const item = document.createElement('div')
      item.className = 'dropdown-item'
      item.textContent = g.name
      item.dataset.groupId = g.groupID
      list.appendChild(item)
    })
    el('groupSelect').textContent = 'Выберите группу'
  }catch(e){
    el('groupSelect').textContent = 'Ошибка загрузки групп'
  }
}

function toggleGroupDropdown(){
  el('groupDropdown').classList.toggle('hidden')
}

function handleGroupClick(event){
  const t = event.target
  if(!t || !t.classList.contains('dropdown-item')) return
  selectedGroupId = t.dataset.groupId || null
  el('groupSelect').textContent = t.textContent
  el('groupDropdown').classList.add('hidden')
  hideError('groupSelect','groupError')
}

function setLoading(v){
  el('loadingBlock').classList.toggle('hidden', !v)
  el('submitButton').disabled = v
}

function submitForm(){
  hideError('shortDescription','shortDescriptionError')
  hideError('contactPerson','contactPersonError')
  hideError('userContacts','userContactsError')
  el('serverError').classList.add('hidden')
  const shortDescription = el('shortDescription').value.trim()
  const userService = el('userService').value.trim()
  const contactPerson = el('contactPerson').value.trim()
  const userContacts = el('userContacts').value.trim()
  let hasError = false
  if(!shortDescription){ showError('shortDescription','shortDescriptionError','Пожалуйста, введите краткое описание услуги.'); hasError = true }
  if(!contactPerson){ showError('contactPerson','contactPersonError','Пожалуйста, введите имя контактного лица.'); hasError = true }
  if(!userContacts){ showError('userContacts','userContactsError','Пожалуйста, введите контакты.'); hasError = true }
  if(hasError) return
  setLoading(true)
  const payload = {
    dataId: 'new_service',
    shortDescription: shortDescription,
    service: userService,
    contactPerson: contactPerson,
    contacts: userContacts,
    groupId: selectedGroupId
  }
  try{
    tg.sendData(JSON.stringify(payload))
    setLoading(false)
    tg.close()
  }catch(e){
    setLoading(false)
    const box = el('serverError')
    box.textContent = 'Ошибка: ' + e.message
    box.classList.remove('hidden')
  }
}

function setupTextAreaBlur(){
  const ta = el('userService')
  if(!ta) return
  document.addEventListener('click', (evt) => {
    if(document.activeElement === ta && evt.target !== ta){
      ta.blur()
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  bootTheme()
  initTelegram()
  el('themeToggle').addEventListener('click', toggleTheme)
  bindEnterBlur('shortDescription')
  bindEnterBlur('contactPerson')
  bindEnterBlur('userContacts')
  el('groupSelect').addEventListener('click', toggleGroupDropdown)
  el('groupDropdown').addEventListener('click', handleGroupClick)
  el('submitButton').addEventListener('click', submitForm)
  setupTextAreaBlur()
  fetchGroups()
})
