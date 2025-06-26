// Configuración de Firebase
import { firebaseConfig } from './firebase-config.js';

// Importaciones de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-firestore.js";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', function() {
  // Rangos disponibles
  const ranks = [' - ', 'Cadete', 'Cabo', 'Cabo Primero', 'Sargento', 'Teniente', 'Teniente Primero', 'Coronel'];

  // Colores para escuadrones
  const squadColors = [
    { name: 'Azul', value: '#3498db', textColor: '#ffffff' },
    { name: 'Rojo', value: '#e74c3c', textColor: '#ffffff' },
    { name: 'Verde', value: '#2ecc71', textColor: '#ffffff' },
    { name: 'Amarillo', value: '#f1c40f', textColor: '#000000' },
    { name: 'Morado', value: '#9b59b6', textColor: '#ffffff' },
    { name: 'Naranja', value: '#e67e22', textColor: '#ffffff' },
    { name: 'Turquesa', value: '#1abc9c', textColor: '#ffffff' },
    { name: 'Personalizado', value: '', textColor: '#ffffff', isCustom: true }
  ];

  // Elementos del DOM
  const dom = {
    welcomeScreen: document.getElementById('welcomeScreen'),
    loginContainer: document.getElementById('loginContainer'),
    appContainer: document.getElementById('appContainer'),
    viewOnlyBtn: document.getElementById('viewOnlyBtn'),
    editTableBtn: document.getElementById('editTableBtn'),
    loginForm: document.getElementById('loginForm'),
    cancelLogin: document.getElementById('cancelLogin'),
    logoutBtn: document.getElementById('logoutBtn'),
    userGreeting: document.getElementById('userGreeting'),
    squadsTable: document.getElementById('squadsTable'),
    addSquadBtn: document.getElementById('addSquad'),
    saveDataBtn: document.getElementById('saveData'),
    loadDataBtn: document.getElementById('loadData')
  };
    
    // Estado de la aplicación
  const appState = {
    squadsData: [],
    currentUser: null,
    isViewOnlyMode: false,
    currentlyEditing: null,
    totalMissionsOverride: null,
    generalStats: {
      name: "General",
      kills: 0,
      deaths: 0,
      missions: 0
    }
  };

  // ========= FUNCIONES UTILITARIAS =========
  function lightenColor(color, percent) {
    if (!color || typeof color !== 'string') return '#ffffff';
    
    let hex = color.replace('#', '');
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    const num = parseInt(hex, 16);
    const amt = Math.round(2.55 * percent);
    
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
  }

  function getContrastColor(hexColor) {
    if (!hexColor || !hexColor.startsWith('#')) return '#000000';
    
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  // ========= MANEJO DE VISTAS =========
  function showWelcomeScreen() {
    dom.welcomeScreen.classList.remove('hidden');
    dom.loginContainer.classList.add('hidden');
    dom.appContainer.classList.add('hidden');
  }

  function showLoginScreen() {
    dom.welcomeScreen.classList.add('hidden');
    dom.loginContainer.classList.remove('hidden');
    dom.appContainer.classList.add('hidden');
  }

  function showAppScreen() {
    dom.welcomeScreen.classList.add('hidden');
    dom.loginContainer.classList.add('hidden');
    dom.appContainer.classList.remove('hidden');
  }

  function updateUI() {
    if (appState.currentUser) {
      dom.userGreeting.textContent = `Usuario: ${appState.currentUser.name} (${appState.isViewOnlyMode ? 'Solo lectura' : 'Edición'})`;
      document.body.classList.toggle('role-admin', appState.currentUser.role === 'admin' && !appState.isViewOnlyMode);
    }
  }

  // ========= AUTENTICACIÓN =========
  async function handleLogin(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      appState.currentUser = {
        username: userCredential.user.email,
        name: userCredential.user.displayName || userCredential.user.email.split('@')[0],
        role: 'admin'
      };
      appState.isViewOnlyMode = false;
      updateUI();
      loadInitialData();
      showAppScreen();
      return true;
    } catch (error) {
      console.error("Error de autenticación:", error);
      alert("Credenciales incorrectas o error de conexión");
      return false;
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      appState.currentUser = null;
      showWelcomeScreen();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }

    // ========= MANEJO DE DATOS =========
  async function loadInitialData() {
    try {
      console.log("Intentando cargar datos desde Firebase...");
      
      // 1. Intento de carga desde Firebase
      const docRef = doc(db, "militaryData", "squads");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        console.log("Datos encontrados en Firebase");
        const data = docSnap.data();
        
        // Procesar datos recibidos
        appState.squadsData = data.squadsData || [];
        appState.totalMissionsOverride = data.totalMissionsOverride || null;
        appState.generalStats = data.generalStats || {
          name: "General",
          kills: 0,
          deaths: 0,
          missions: 0
        };
        
        // Actualizar localStorage como caché
        localStorage.setItem('squadsDataBackup', JSON.stringify({
          squadsData: appState.squadsData,
          totalMissionsOverride: appState.totalMissionsOverride,
          generalStats: appState.generalStats, // Añade esta línea
          lastUpdated: new Date().toISOString()
        }));
        
        // Configurar listener en tiempo real con manejo de errores
        setupRealtimeListener(docRef);
        
      } else {
        console.log("No existe documento en Firebase, creando uno nuevo");
        await initializeFirebaseData();
      }
      
      renderTable();
      
    } catch (firebaseError) {
      console.error("Error al cargar desde Firebase:", firebaseError);
      
      // 2. Fallback: Intentar cargar desde localStorage
      try {
        const localData = localStorage.getItem('squadsDataBackup');
        if (localData) {
          const parsedData = JSON.parse(localData);
          console.log("Cargando datos desde caché local");
          
          appState.squadsData = parsedData.squadsData || [];
          appState.totalMissionsOverride = parsedData.totalMissionsOverride || null;
          appState.generalStats = parsedData.generalStats || { // Añade esta línea
            name: "General",
            kills: 0,
            deaths: 0,
            missions: 0
          };
          
          renderTable();
          showTemporaryMessage("Usando datos locales (última versión guardada)");
          return;
        }
      } catch (localError) {
        console.error("Error al cargar desde localStorage:", localError);
      }
      
      // 3. Fallback final: Cargar datos por defecto
      console.log("Cargando datos por defecto");
      loadDefaultData();
      renderTable();
      showTemporaryMessage("Error al conectar con el servidor. Usando datos de ejemplo.");
    }
  }

  function loadDefaultData() {
    appState.squadsData = [
      {
        name: "Escuadrón Alfa",
        color: squadColors[0].value,
        textColor: getContrastColor(squadColors[0].value),
        colonel: "Coronel Rodríguez",
        colonelRank: "Coronel",
        members: [
          { name: "Soldado Pérez", rank: "Cabo", kills: 12, deaths: 2, missions: 15 },
          { name: "Soldado Gómez", rank: "Cabo Primero", kills: 8, deaths: 3, missions: 12 },
          { name: "Soldado López", rank: "Sargento", kills: 15, deaths: 1, missions: 18 },
          { name: "Soldado Martínez", rank: "Teniente", kills: 5, deaths: 4, missions: 10 }
        ]
      }
    ];
    appState.totalMissionsOverride = null;
    appState.generalStats = {
      name: "General",
      kills: 0,
      deaths: 0,
      missions: 0
    };
  }

  async function saveData() {
    // Preparar datos para guardar
    const dataToSave = {
      squadsData: appState.squadsData,
      totalMissionsOverride: appState.totalMissionsOverride,
      generalStats: appState.generalStats, // Asegurar que siempre se incluya
      lastUpdated: new Date().toISOString()
    };

    try {
      // 1. Intento de guardar en Firebase
      console.log("Intentando guardar en Firebase...");
      await setDoc(doc(db, "militaryData", "squads"), dataToSave);
      console.log("Datos guardados exitosamente en Firebase");
    
      // 2. Actualizar caché local
      localStorage.setItem('squadsDataBackup', JSON.stringify(dataToSave));
      console.log("Datos guardados en caché local");
      
      // Mostrar notificación de éxito
      showTemporaryMessage("Datos guardados exitosamente", "success");
    
    } catch (firebaseError) {
      console.error("Error al guardar en Firebase:", firebaseError);
      
      // 3. Fallback: Guardar localmente
      try {
        localStorage.setItem('squadsDataBackup', JSON.stringify(dataToSave));
        console.log("Datos guardados localmente como fallback");
          
        // Mostrar advertencia
        showTemporaryMessage(
          "Datos guardados localmente. Se sincronizarán cuando se restablezca la conexión.", 
          "warning"
        );
    
        // Programar reintento
        if (!appState.pendingSync) {
          appState.pendingSync = true;
          setTimeout(retryPendingSync, 30000); // Reintentar en 30 segundos
        }
    
      } catch (localError) {
        console.error("Error al guardar en localStorage:", localError);
        showTemporaryMessage("Error al guardar los datos", "error");
      }
    }
  }

  // ===== FUNCIONES AUXILIARES =====

  async function initializeFirebaseData() {
    const initialData = {
      squadsData: [
        {
          name: "Escuadrón Alfa",
          color: squadColors[0].value,
          textColor: getContrastColor(squadColors[0].value),
          colonel: "Coronel Rodríguez",
          colonelRank: "Coronel",
          members: [
            { name: "Soldado Pérez", rank: "Cabo", kills: 12, deaths: 2, missions: 15 },
            { name: "Soldado Gómez", rank: "Cabo Primero", kills: 8, deaths: 3, missions: 12 },
            { name: "Soldado López", rank: "Sargento", kills: 15, deaths: 1, missions: 18 },
            { name: "Soldado Martínez", rank: "Teniente", kills: 5, deaths: 4, missions: 10 }
          ]
        }
      ],
      totalMissionsOverride: null,
      generalStats: {
        name: "General",
        kills: 0,
        deaths: 0,
        missions: 0
      },
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, "militaryData", "squads"), initialData);
    appState.squadsData = initialData.squadsData;
    appState.generalStats = initialData.generalStats;
  }

  function setupRealtimeListener(docRef) {
    // Limpiar listener anterior si existe
    if (appState.unsubscribeSnapshot) {
      appState.unsubscribeSnapshot();
    }
    
    appState.unsubscribeSnapshot = onSnapshot(docRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log("Cambios recibidos en tiempo real");
          
          appState.squadsData = data.squadsData || [];
          appState.totalMissionsOverride = data.totalMissionsOverride || null;
          appState.generalStats = data.generalStats || {
            name: "General",
            kills: 0,
            deaths: 0,
            missions: 0
          };
          
          // Actualizar caché local
          localStorage.setItem('squadsDataBackup', JSON.stringify({
            squadsData: appState.squadsData,
            totalMissionsOverride: appState.totalMissionsOverride,
            generalStats: appState.generalStats,
            lastUpdated: new Date().toISOString()
          }));
          
          renderTable();
        }
      },
      (error) => {
        console.error("Error en listener en tiempo real:", error);
        
        if (error.code === 'permission-denied') {
          showTemporaryMessage("Se perdieron los permisos. Por favor inicia sesión nuevamente.", "error");
          handleLogout();
        } else {
          showTemporaryMessage("Error en conexión en tiempo real. Usando datos locales.", "warning");
        }
      }
    );
  }

  async function retryPendingSync() {
    if (!appState.pendingSync) return;
    
    try {
      const localData = localStorage.getItem('squadsDataBackup');
      if (localData) {
        const dataToSave = JSON.parse(localData);
        // Asegurarse de incluir generalStats en los datos a guardar
        const completeData = {
          ...dataToSave,
          generalStats: dataToSave.generalStats || appState.generalStats
        };
        await setDoc(doc(db, "militaryData", "squads"), completeData);
        
        console.log("Datos pendientes sincronizados exitosamente");
        appState.pendingSync = false;
        showTemporaryMessage("Datos pendientes sincronizados con el servidor", "success");
      }
    } catch (error) {
      console.error("Error en reintento de sincronización:", error);
      // Volver a programar reintento
      setTimeout(retryPendingSync, 60000); // Reintentar en 1 minuto
    }
  }

  function showTemporaryMessage(message, type = "info") {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.position = 'fixed';
    messageDiv.style.bottom = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.padding = '10px 20px';
    messageDiv.style.borderRadius = '4px';
    messageDiv.style.zIndex = '1000';

    switch (type) {
        case "success":
        messageDiv.style.backgroundColor = '#4CAF50';
        messageDiv.style.color = 'white';
        break;
        case "error":
        messageDiv.style.backgroundColor = '#f44336';
        messageDiv.style.color = 'white';
        break;
        case "warning":
        messageDiv.style.backgroundColor = '#ff9800';
        messageDiv.style.color = 'white';
        break;
        default:
        messageDiv.style.backgroundColor = '#2196F3';
        messageDiv.style.color = 'white';
    }
    
    document.body.appendChild(messageDiv);

  // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
  }

  function calculateGlobalTotals() {
    // Iniciar con las estadísticas del General (solo kills y deaths)
    let totals = {
      kills: appState.generalStats.kills || 0,
      deaths: appState.generalStats.deaths || 0,
      missions: 0 // Las misiones se manejan independientemente
    };

    // Sumar estadísticas de todos los miembros de los escuadrones (solo kills y deaths)
    appState.squadsData.forEach(squad => {
      squad.members.forEach(member => {
        totals.kills += member.kills || 0;
        totals.deaths += member.deaths || 0;
        
      });
    });

    return totals;
  }

    // ========= RENDERIZADO DE TABLA =========
  function renderTable() {
    if (!appState.currentUser) return;

    const totals = calculateGlobalTotals();
    const isEditMode = appState.currentUser.role === 'admin' && !appState.isViewOnlyMode;

    const displayMissions = appState.totalMissionsOverride !== null 
    ? appState.totalMissionsOverride 
    : appState.squadsData.reduce((sum, squad) => {
        return sum + squad.members.reduce((squadSum, member) => squadSum + (member.missions || 0), 0);
      }, 0);

    let tableHTML = `
      <div class="global-totals">
        <h3>Totales Generales</h3>
        <div class="totals-grid">
          <div>Total Asesinatos: <span>${totals.kills}</span></div>
          <div>Total Muertes: <span>${totals.deaths}</span></div>
          <div>Total Misiones: 
            <input type="number" value="${displayMissions}" min="0" id="totalMissionsInput" 
            ${!isEditMode ? 'class="readonly-input" readonly' : ''}>
          </div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Escuadrón</th>
            <th>Miembro</th>
            <th>Rango</th>
            <th>Asesinatos</th>
            <th>Muertes</th>
            <th>Misiones</th>
            ${isEditMode ? '<th>Acciones</th>' : ''}
          </tr>
        </thead>
        <tbody>
        <!-- Fila del General -->`;
      tableHTML += `
        <tr class="general-row" style="background-color: #2c3e50; color: white; font-weight: bold;">
          <td>-</td>
          <td ${isEditMode ? 'class="editable-name"' : ''} data-type="general-name">${appState.generalStats.name}</td>
          <td>General</td>
          <td><input type="number" value="${appState.generalStats.kills}" min="0" data-type="general-kills" 
              ${!isEditMode ? 'class="readonly-input" readonly' : ''}></td>
          <td><input type="number" value="${appState.generalStats.deaths}" min="0" data-type="general-deaths" 
              ${!isEditMode ? 'class="readonly-input" readonly' : ''}></td>
          <td><input type="number" value="${appState.generalStats.missions}" min="0" data-type="general-missions" 
              ${!isEditMode ? 'class="readonly-input" readonly' : ''}></td>
          ${isEditMode ? '<td></td>' : ''}
        </tr>`;

    appState.squadsData.forEach((squad, squadIndex) => {
      // Fila del coronel
      tableHTML += `
        <tr class="squad-header" style="background-color: ${squad.color}; color: ${squad.textColor}">
          <td rowspan="${squad.members.length + 1}" ${isEditMode ? 'class="editable-squad-name"' : ''} 
              data-squad="${squadIndex}">${squad.name}</td>
          <td ${isEditMode ? 'class="editable-name"' : ''} 
              data-squad="${squadIndex}" data-member="colonel">${squad.colonel}</td>
          <td>${squad.colonelRank}</td>
          <td colspan="3">-</td>
          ${isEditMode ? `<td rowspan="${squad.members.length + 1}">
            <button class="delete-squad" data-squad="${squadIndex}">Eliminar</button>
            <button class="change-color" data-squad="${squadIndex}">Color</button>
          </td>` : ''}
        </tr>`;

      // Filas de los miembros
      squad.members.forEach((member, memberIndex) => {
        tableHTML += `
          <tr class="member-row" style="background-color: ${lightenColor(squad.color, 20)}; color: ${squad.textColor}">
            <td ${isEditMode ? 'class="editable-name"' : ''} 
                data-squad="${squadIndex}" data-member="${memberIndex}">${member.name}</td>
            <td ${isEditMode ? 'class="editable-rank"' : ''} 
                data-squad="${squadIndex}" data-member="${memberIndex}">${member.rank}</td>
            <td><input type="number" value="${member.kills}" min="0" data-type="kills" data-squad="${squadIndex}" data-member="${memberIndex}" 
                ${!isEditMode ? 'class="readonly-input" readonly' : ''}></td>
            <td><input type="number" value="${member.deaths}" min="0" data-type="deaths" data-squad="${squadIndex}" data-member="${memberIndex}" 
                ${!isEditMode ? 'class="readonly-input" readonly' : ''}></td>
            <td><input type="number" value="${member.missions}" min="0" data-type="missions" data-squad="${squadIndex}" data-member="${memberIndex}" 
                ${!isEditMode ? 'class="readonly-input" readonly' : ''}></td>
            ${isEditMode ? '<td></td>' : ''}
          </tr>`;
      });
    });

    tableHTML += `</tbody></table>`;
    dom.squadsTable.innerHTML = tableHTML;

    if (isEditMode) {
      setupEditListeners();
    }
  }

  function setupEditListeners() {
    // Inputs numéricos para kills y deaths (incluyendo general)
    document.querySelectorAll('input[data-type="kills"], input[data-type="deaths"], input[data-type^="general-kills"], input[data-type^="general-deaths"]').forEach(input => {
      input.addEventListener('change', function() {
        const squadIndex = parseInt(this.dataset.squad);
        const memberIndex = parseInt(this.dataset.member);
        const statType = this.dataset.type;
        const value = parseInt(this.value) || 0;

        if (statType.startsWith('general-')) {
          // Manejar estadísticas del General
          const generalStat = statType.replace('general-', '');
          appState.generalStats[generalStat] = value;
        } else if (memberIndex >= 0) {
          // Manejar miembros normales
          appState.squadsData[squadIndex].members[memberIndex][statType] = value;
        }
        saveData();
      });
    });

    // Inputs de misiones de miembros (no incluye general)
    document.querySelectorAll('input[data-type="missions"]:not([data-type^="general-"])').forEach(input => {
      input.addEventListener('change', function() {
        const squadIndex = parseInt(this.dataset.squad);
        const memberIndex = parseInt(this.dataset.member);
        const value = parseInt(this.value) || 0;

        if (memberIndex >= 0) {
          appState.squadsData[squadIndex].members[memberIndex].missions = value;
        }
        saveData();
      });
    });

    // Input especial para misiones totales
    document.getElementById('totalMissionsInput')?.addEventListener('change', function() {
      const value = parseInt(this.value) || 0;
      appState.totalMissionsOverride = value;
      saveData();
    });

    // Botones de eliminar
    document.querySelectorAll('.delete-squad').forEach(btn => {
      btn.addEventListener('click', function() {
        const squadIndex = parseInt(this.dataset.squad);
        if (confirm(`¿Eliminar ${appState.squadsData[squadIndex].name}?`)) {
          appState.squadsData.splice(squadIndex, 1);
          saveData();
        }
      });
    });

    // Botones de color
    document.querySelectorAll('.change-color').forEach(btn => {
      btn.addEventListener('click', function() {
        const squadIndex = parseInt(this.dataset.squad);
        showColorPicker(squadIndex);
      });
    });

    // Edición de nombres
    document.querySelectorAll('.editable-squad-name').forEach(el => {
      el.addEventListener('click', function() {
        const squadIndex = parseInt(this.dataset.squad);
        startEditingSquadName(this, squadIndex);
      });
    });

    document.querySelectorAll('.editable-name').forEach(el => {
      el.addEventListener('click', function() {
        const squadIndex = parseInt(this.dataset.squad);
        const memberType = this.dataset.member;
        startEditingName(this, squadIndex, memberType);
      });
    });

    // Edición de rangos
    document.querySelectorAll('.editable-rank').forEach(el => {
      el.addEventListener('click', function() {
        const squadIndex = parseInt(this.dataset.squad);
        const memberType = this.dataset.member;
        startEditingRank(this, squadIndex, memberType);
      });
    });

    // Edición nombre del General
    document.querySelectorAll('[data-type="general-name"]').forEach(el => {
      el.addEventListener('click', function() {
        if (appState.currentUser?.role === 'admin' && !appState.isViewOnlyMode) {
          startEditingGeneralName(this);
        }
      });
    });
  }

  // ========= FUNCIONES DE EDICIÓN =========
  function showColorPicker(squadIndex) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    
    let colorOptions = '';
    squadColors.forEach((color, index) => {
      if (color.isCustom) {
        colorOptions += `
          <div style="padding: 10px; margin: 5px; border-radius: 4px; cursor: pointer; border: 1px dashed #ccc;"
                onclick="window.applyCustomColorPrompt(${squadIndex})">
            <div style="display: flex; align-items: center;">
              <div style="width: 20px; height: 20px; background: ${color.value || '#fff'}; border: 1px solid #000; margin-right: 10px;"></div>
              ${color.name} (HEX)
            </div>
          </div>`;
      } else {
        colorOptions += `
          <div style="background: ${color.value}; color: ${color.textColor}; 
                      padding: 10px; margin: 5px; border-radius: 4px; cursor: pointer;
                      ${appState.squadsData[squadIndex].color === color.value ? 'border: 2px solid black;' : ''}"
                onclick="window.applyColorChange(${squadIndex}, ${index})">
            ${color.name}
          </div>`;
      }
    });
    
    modal.innerHTML = `
      <div style="background: white; padding: 20px; border-radius: 8px; max-width: 500px; width: 80%;">
        <h3>Seleccionar color para ${appState.squadsData[squadIndex].name}</h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0;">
          ${colorOptions}
        </div>
        <div id="customColorSection" style="margin-top: 20px;"></div>
        <button onclick="window.closeColorPicker()" 
                style="padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
          Cancelar
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Funciones globales temporales
    window.applyColorChange = function(squadIndex, colorIndex) {
      appState.squadsData[squadIndex].color = squadColors[colorIndex].value;
      appState.squadsData[squadIndex].textColor = squadColors[colorIndex].textColor;
      saveData();
      window.closeColorPicker();
    };
    
    window.applyCustomColorPrompt = function(squadIndex) {
      const customSection = modal.querySelector('#customColorSection');
      customSection.innerHTML = `
        <div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 5px;">Ingresa código HEX (ej: #FF5733):</label>
          <input type="text" id="customColorInput" placeholder="#RRGGBB" 
                  style="padding: 8px; width: 100%; box-sizing: border-box;"
                  pattern="^#[0-9A-Fa-f]{6}$" title="Formato HEX (ej: #FF5733)">
        </div>
        <div id="colorPreview" style="width: 100%; height: 40px; margin: 10px 0; border: 1px solid #ccc; 
                                    display: flex; align-items: center; justify-content: center;">
          Previsualización
        </div>
        <div style="display: flex; justify-content: space-between;">
          <button onclick="window.applyCustomColor(${squadIndex})" 
                  style="padding: 8px 16px; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Aplicar
          </button>
          <button onclick="window.clearCustomColor()" 
                  style="padding: 8px 16px; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Limpiar
          </button>
        </div>
      `;
      
      document.getElementById('customColorInput').addEventListener('input', function() {
        const colorPreview = document.getElementById('colorPreview');
        if (this.value.match(/^#[0-9A-Fa-f]{6}$/i)) {
          colorPreview.style.backgroundColor = this.value;
          colorPreview.style.color = getContrastColor(this.value);
          colorPreview.textContent = this.value;
        } else {
          colorPreview.style.backgroundColor = '#fff';
          colorPreview.style.color = '#000';
          colorPreview.textContent = 'Formato inválido';
        }
      });
      
      window.applyCustomColor = function(squadIndex) {
        const input = document.getElementById('customColorInput');
        if (input.value.match(/^#[0-9A-Fa-f]{6}$/i)) {
          appState.squadsData[squadIndex].color = input.value;
          appState.squadsData[squadIndex].textColor = getContrastColor(input.value);
          saveData();
          window.closeColorPicker();
        } else {
          alert('Por favor ingresa un código HEX válido (ejemplo: #FF5733)');
        }
      };
      
      window.clearCustomColor = function() {
        document.getElementById('customColorInput').value = '';
        const colorPreview = document.getElementById('colorPreview');
        colorPreview.style.backgroundColor = '#fff';
        colorPreview.style.color = '#000';
        colorPreview.textContent = 'Previsualización';
      };
    };
    
    window.closeColorPicker = function() {
      modal.remove();
      // Limpiar funciones globales
      ['applyColorChange', 'applyCustomColorPrompt', 'applyCustomColor', 'clearCustomColor', 'closeColorPicker'].forEach(fn => {
        delete window[fn];
      });
    };
  }

  function startEditingSquadName(element, squadIndex) {
    const currentName = appState.squadsData[squadIndex].name;
    element.innerHTML = `<input type="text" value="${currentName}" style="width: 90%;">`;
    const input = element.querySelector('input');
    input.focus();
    
    const finishEditing = () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        appState.squadsData[squadIndex].name = newName;
        saveData();
      }
      renderTable();
    };
    
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') finishEditing();
    });
  }

  function startEditingName(element, squadIndex, memberType) {
    const currentName = memberType === 'colonel' 
      ? appState.squadsData[squadIndex].colonel 
      : appState.squadsData[squadIndex].members[parseInt(memberType)].name;
    
    element.innerHTML = `<input type="text" value="${currentName}" style="width: 90%;">`;
    const input = element.querySelector('input');
    input.focus();
    
    const finishEditing = () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        if (memberType === 'colonel') {
          appState.squadsData[squadIndex].colonel = newName;
        } else {
          appState.squadsData[squadIndex].members[parseInt(memberType)].name = newName;
        }
        saveData();
      }
      renderTable();
    };
    
    input.addEventListener('blur', finishEditing);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') finishEditing();
    });
  }

  function startEditingRank(element, squadIndex, memberType) {
    if (memberType === 'colonel') return;

    const currentRank = appState.squadsData[squadIndex].members[parseInt(memberType)].rank;
    
    // Filtrar rangos para excluir "Coronel" de las opciones de soldados
    const availableRanks = ranks.filter(rank => rank !== 'Coronel');
    
    let options = '';
    availableRanks.forEach(rank => {
      options += `<option value="${rank}" ${rank === currentRank ? 'selected' : ''}>${rank}</option>`;
    });
    
    element.innerHTML = `
      <select onfocus="this.size=${availableRanks.length > 5 ? 5 : availableRanks.length};" 
              onblur="this.size=0; this.dispatchEvent(new Event('change'))"
              onchange="this.size=0">
        ${options}
      </select>
    `;
    
    const select = element.querySelector('select');
    
    // Mostrar el dropdown inmediatamente
    select.focus();
    select.size = availableRanks.length > 5 ? 5 : availableRanks.length;
    
    select.addEventListener('change', () => {
      const newRank = select.value;
      appState.squadsData[squadIndex].members[parseInt(memberType)].rank = newRank;
      saveData();
      renderTable(); // Actualizar la tabla después del cambio
    });
  }

  function startEditingGeneralName(element) {
    const currentName = appState.generalStats.name;
    
    // Guardar el contenido original para restaurar si se cancela
    const originalContent = element.innerHTML;
    
    element.innerHTML = `<input type="text" value="${currentName}" style="width: 90%;">`;
    const input = element.querySelector('input');
    input.focus();
    
    const finishEditing = (saveChanges) => {
      if (saveChanges) {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
          if (newName.length < 2) {
            alert("El nombre del general debe tener al menos 2 caracteres");
            input.focus();
            return;
          }
          appState.generalStats.name = newName;
          saveData();
        }
      }
      renderTable(); // Vuelve a renderizar la tabla en cualquier caso
    };
    
    // Guardar al hacer blur o presionar Enter
    input.addEventListener('blur', () => finishEditing(true));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') finishEditing(true);
    });
    
    // Manejo de la tecla Escape para cancelar
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') finishEditing(false);
    });
  }

  // ========= EVENT LISTENERS =========
  dom.viewOnlyBtn.addEventListener('click', () => {
    appState.isViewOnlyMode = true;
    appState.currentUser = { username: 'guest', name: 'Invitado', role: 'viewer' };
    updateUI();
    loadInitialData();
    showAppScreen();
  });

  dom.editTableBtn.addEventListener('click', showLoginScreen);
  dom.cancelLogin.addEventListener('click', showWelcomeScreen);

  dom.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = dom.loginForm.querySelector('#username').value;
    const password = dom.loginForm.querySelector('#password').value;
    
    await handleLogin(email, password);
  });

  dom.logoutBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
      handleLogout();
    }
  });

  dom.addSquadBtn.addEventListener('click', () => {
    const colorIndex = appState.squadsData.length % (squadColors.length - 1);
    const newSquad = {
      name: `Escuadrón ${appState.squadsData.length + 1}`,
      color: squadColors[colorIndex].value,
      textColor: squadColors[colorIndex].textColor,
      colonel: `Coronel Nuevo`,
      colonelRank: "Coronel",
      members: Array(4).fill().map((_, i) => ({
        name: `Soldado ${i + 1}`,
        rank: "Cabo",
        kills: 0,
        deaths: 0,
        missions: 0
      }))
    };
    appState.squadsData.push(newSquad);
    saveData();
  });

  dom.saveDataBtn.addEventListener('click', () => {
    saveData();
    alert('Datos guardados en la nube');
  });

  dom.loadDataBtn.addEventListener('click', () => {
    loadInitialData();
    alert('Datos actualizados desde la nube');
  });

  // Inicialización
  showWelcomeScreen();

});
