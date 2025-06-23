document.addEventListener('DOMContentLoaded', function() {
    // Base de datos de usuarios
    const users = {
        'admin': { password: 'admin123', role: 'admin', name: 'Administrador' },
        'coronel': { password: 'militar123', role: 'admin', name: 'Coronel Pérez' }
    };

    // Rangos disponibles
    const ranks = ['Cadete', 'Cabo', 'Cabo Primero', 'Sargento', 'Teniente', 'Teniente Primero', 'Coronel'];

    // Colores para escuadrones (con opción personalizada)
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
        totalMissionsOverride: null
    };

    // Función para aclarar colores
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

    // Función para determinar color de texto contrastante
    function getContrastColor(hexColor) {
        if (!hexColor || !hexColor.startsWith('#')) return '#000000';
        
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    // --- Manejo de Vistas ---
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

    // --- Autenticación ---
    function handleLogin(username, password) {
        if (users[username] && users[username].password === password) {
            appState.currentUser = {
                username,
                name: users[username].name,
                role: users[username].role
            };
            appState.isViewOnlyMode = false;
            updateUI();
            loadInitialData();
            showAppScreen();
            return true;
        }
        return false;
    }

    function handleLogout() {
        appState.currentUser = null;
        showWelcomeScreen();
    }

    // --- Manejo de Datos ---
    function loadInitialData() {
        const savedData = localStorage.getItem('squadsData');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                appState.squadsData = parsedData.squadsData || [];
                appState.totalMissionsOverride = parsedData.totalMissionsOverride || null;
                
                appState.squadsData.forEach(squad => {
                    if (!squad.color) {
                        const defaultColor = squadColors[0];
                        squad.color = defaultColor.value;
                        squad.textColor = getContrastColor(defaultColor.value);
                    }
                });
            } catch (e) {
                console.error("Error al cargar datos:", e);
                loadDefaultData();
            }
        } else {
            loadDefaultData();
        }
        renderTable();
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
    }

    function saveData() {
        const dataToSave = {
            squadsData: appState.squadsData,
            totalMissionsOverride: appState.totalMissionsOverride
        };
        localStorage.setItem('squadsData', JSON.stringify(dataToSave));
    }

    // --- Renderizado ---
    function updateUI() {
        if (appState.currentUser) {
            dom.userGreeting.textContent = `Usuario: ${appState.currentUser.name} (${appState.isViewOnlyMode ? 'Solo lectura' : 'Edición'})`;
            document.body.classList.toggle('role-admin', appState.currentUser.role === 'admin' && !appState.isViewOnlyMode);
        }
    }

    function renderTable() {
        if (!appState.currentUser) return;

        const totals = calculateGlobalTotals();
        const isEditMode = appState.currentUser.role === 'admin' && !appState.isViewOnlyMode;

        let tableHTML = `
            <div class="global-totals">
                <h3>Totales Generales</h3>
                <div class="totals-grid">
                    <div>Total Asesinatos: <span>${totals.kills}</span></div>
                    <div>Total Muertes: <span>${totals.deaths}</span></div>
                    <div>Total Misiones: 
                        <input type="number" value="${appState.totalMissionsOverride ?? totals.missions}" min="0" id="totalMissionsInput" 
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
                <tbody>`;

        appState.squadsData.forEach((squad, squadIndex) => {
            // Fila del coronel
            tableHTML += `
                <tr class="squad-header" style="background-color: ${squad.color}; color: ${squad.textColor}">
                    <td rowspan="${squad.members.length + 1}" ${isEditMode ? 'class="editable-squad-name"' : ''} 
                        data-squad="${squadIndex}">${squad.name}</td>
                    <td ${isEditMode ? 'class="editable-name"' : ''} 
                        data-squad="${squadIndex}" data-member="colonel">${squad.colonel}</td>
                    <td>${squad.colonelRank}</td> <!-- Eliminada la clase editable-rank -->
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
        // Inputs numéricos
        document.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener('change', function() {
                const squadIndex = parseInt(this.dataset.squad);
                const memberIndex = parseInt(this.dataset.member);
                const statType = this.dataset.type;
                const value = parseInt(this.value) || 0;

                if (memberIndex >= 0) {
                    appState.squadsData[squadIndex].members[memberIndex][statType] = value;
                } else if (this.id === 'totalMissionsInput') {
                    appState.totalMissionsOverride = value;
                }
                renderTable();
            });
        });

        // Botones de eliminar
        document.querySelectorAll('.delete-squad').forEach(btn => {
            btn.addEventListener('click', function() {
                const squadIndex = parseInt(this.dataset.squad);
                if (confirm(`¿Eliminar ${appState.squadsData[squadIndex].name}?`)) {
                    appState.squadsData.splice(squadIndex, 1);
                    renderTable();
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
    }

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
                         onclick="showCustomColorInput(${squadIndex})">
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
                         onclick="applyColorChange(${squadIndex}, ${index})">
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
                <button onclick="closeColorPicker()" 
                        style="padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;">
                    Cancelar
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        window.applyColorChange = function(squadIndex, colorIndex) {
            appState.squadsData[squadIndex].color = squadColors[colorIndex].value;
            appState.squadsData[squadIndex].textColor = squadColors[colorIndex].textColor;
            renderTable();
            closeColorPicker();
        };
        
        window.showCustomColorInput = function(squadIndex) {
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
                    <button onclick="applyCustomColor(${squadIndex})" 
                            style="padding: 8px 16px; background: #2ecc71; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Aplicar
                    </button>
                    <button onclick="clearCustomColor()" 
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
                    renderTable();
                    closeColorPicker();
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
            delete window.applyColorChange;
            delete window.showCustomColorInput;
            delete window.applyCustomColor;
            delete window.clearCustomColor;
            delete window.closeColorPicker;
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
            }
            renderTable();
        };
        
        input.addEventListener('blur', finishEditing);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') finishEditing();
        });
    }

    function startEditingRank(element, squadIndex, memberType) {
        // No permitir editar el rango del coronel
        if (memberType === 'colonel') {
            return;
        }

        const currentRank = appState.squadsData[squadIndex].members[parseInt(memberType)].rank;
        
        element.setAttribute('data-value', currentRank);
        
        let options = '';
        ranks.forEach(rank => {
            options += `<option value="${rank}" ${rank === currentRank ? 'selected' : ''}>${rank}</option>`;
        });
        
        element.innerHTML = `
            <select onblur="this.dispatchEvent(new Event('change'))">
                ${options}
            </select>
        `;
        const select = element.querySelector('select');
        
        setTimeout(() => {
            select.focus();
            select.size = select.length > 5 ? 5 : select.length;
        }, 0);
        
        select.addEventListener('change', () => {
            const newRank = select.value;
            element.setAttribute('data-value', newRank);
            appState.squadsData[squadIndex].members[parseInt(memberType)].rank = newRank;
            renderTable();
        });
    }

    function calculateGlobalTotals() {
        let totalKills = 0;
        let totalDeaths = 0;
        let totalMissions = 0;
        
        appState.squadsData.forEach(squad => {
            squad.members.forEach(member => {
                totalKills += member.kills || 0;
                totalDeaths += member.deaths || 0;
                totalMissions += member.missions || 0;
            });
        });

        return { kills: totalKills, deaths: totalDeaths, missions: totalMissions };
    }

    // --- Event Listeners ---
    dom.viewOnlyBtn.addEventListener('click', () => {
        appState.isViewOnlyMode = true;
        appState.currentUser = { username: 'guest', name: 'Invitado', role: 'viewer' };
        updateUI();
        loadInitialData();
        showAppScreen();
    });

    dom.editTableBtn.addEventListener('click', showLoginScreen);

    dom.cancelLogin.addEventListener('click', showWelcomeScreen);

    dom.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = dom.loginForm.querySelector('#username').value;
        const password = dom.loginForm.querySelector('#password').value;
        
        if (!handleLogin(username, password)) {
            alert('Credenciales incorrectas');
        }
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
        renderTable();
    });

    dom.saveDataBtn.addEventListener('click', () => {
        saveData();
        alert('Datos guardados correctamente');
    });

    dom.loadDataBtn.addEventListener('click', () => {
        loadInitialData();
        alert('Datos cargados correctamente');
    });

    // Inicialización
    showWelcomeScreen();
});