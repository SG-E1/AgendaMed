document.addEventListener('DOMContentLoaded', function() {
    // Elementos del DOM
    const addAppointmentBtn = document.getElementById('addAppointmentBtn');
    const addDoctorBtn = document.getElementById('addDoctorBtn');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const appointmentsList = document.getElementById('appointmentsList');
    const appointmentModal = document.getElementById('appointmentModal');
    const doctorModal = document.getElementById('doctorModal');
    const closeBtns = document.querySelectorAll('.close-btn');
    const appointmentForm = document.getElementById('appointmentForm');
    const doctorForm = document.getElementById('doctorForm');
    const doctorSelect = document.getElementById('appointmentDoctor');
    const modalTitle = document.getElementById('modalTitle');
    const notification = document.getElementById('notification');
    const doctorsTabs = document.getElementById('doctorsTabs');
    const viewSwitcher = document.querySelector('.view-switcher');
    const listView = document.getElementById('listView');
    const calendarView = document.getElementById('calendarView');
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthEl = document.getElementById('currentMonth');
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    
    // Variables de estado
    let appointments = JSON.parse(localStorage.getItem('medicalAppointments')) || [];
    let doctors = JSON.parse(localStorage.getItem('medicalDoctors')) || [
        { id: '1', name: 'Dr. Ejemplo', specialty: 'General', color: '#4a6fa5' }
    ];
    let isEditing = false;
    let currentEditingId = null;
    let currentDoctorId = doctors[0]?.id || null;
    let currentView = 'list';
    let currentDate = new Date();
    
    // Inicializar la aplicación
    function init() {
        renderDoctorsTabs();
        renderAppointmentsList();
        renderCalendar();
        setupEventListeners();
        setupServiceWorker();
        checkUpcomingAppointments();
        setInterval(checkUpcomingAppointments, 60000); // Revisar cada minuto
    }
    
    // Configurar Service Worker para PWA
    function setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('ServiceWorker registrado');
                })
                .catch(err => {
                    console.log('ServiceWorker falló:', err);
                });
        }
    }
    
    // Configurar event listeners
    function setupEventListeners() {
        addAppointmentBtn.addEventListener('click', openAddAppointmentModal);
        addDoctorBtn.addEventListener('click', openAddDoctorModal);
        closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') handleSearch();
        });
        appointmentForm.addEventListener('submit', handleFormSubmit);
        doctorForm.addEventListener('submit', handleDoctorFormSubmit);
        
        // Cambiar vista
        viewSwitcher.addEventListener('click', function(e) {
            if (e.target.tagName === 'BUTTON') {
                const view = e.target.dataset.view;
                if (view) {
                    setCurrentView(view);
                }
            }
        });
        
        // Navegación del calendario
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar();
        });
        
        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar();
        });
        
        // Cerrar modales al hacer clic fuera
        window.addEventListener('click', function(e) {
            if (e.target === appointmentModal) closeModal();
            if (e.target === doctorModal) closeModal();
        });
    }
    
    // Establecer vista actual
    function setCurrentView(view) {
        currentView = view;
        
        // Actualizar botones
        document.querySelectorAll('.view-switcher button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Mostrar vista correspondiente
        listView.classList.toggle('active', view === 'list');
        calendarView.classList.toggle('active', view === 'calendar');
        
        if (view === 'calendar') {
            renderCalendar();
        }
    }
    
    // Renderizar pestañas de doctores
    function renderDoctorsTabs() {
        doctorsTabs.innerHTML = doctors.map(doctor => `
            <button class="doctor-tab ${doctor.id === currentDoctorId ? 'active' : ''}" 
                    data-id="${doctor.id}" 
                    style="background-color: ${doctor.id === currentDoctorId ? doctor.color : '#f0f0f0'}; 
                           color: ${doctor.id === currentDoctorId ? 'white' : 'inherit'}">
                ${doctor.name.split(' ')[0]}
            </button>
        `).join('');
        
        // Event listeners para pestañas
        document.querySelectorAll('.doctor-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                currentDoctorId = this.dataset.id;
                renderDoctorsTabs();
                if (currentView === 'list') {
                    renderAppointmentsList();
                } else {
                    renderCalendar();
                }
            });
        });
        
        // Actualizar select de doctores en el modal
        doctorSelect.innerHTML = doctors.map(doctor => `
            <option value="${doctor.id}" ${doctor.id === currentDoctorId ? 'selected' : ''}>
                ${doctor.name} - ${doctor.specialty}
            </option>
        `).join('');
    }
    
    // Abrir modal para nueva cita
    function openAddAppointmentModal() {
        isEditing = false;
        currentEditingId = null;
        modalTitle.textContent = 'Nueva Cita';
        appointmentForm.reset();
        doctorSelect.value = currentDoctorId;
        
        // Establecer fecha y hora actual como valores por defecto
        const now = new Date();
        document.getElementById('appointmentDate').valueAsDate = now;
        document.getElementById('appointmentTime').value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        appointmentModal.style.display = 'flex';
    }
    
    // Abrir modal para agregar doctor
    function openAddDoctorModal() {
        doctorForm.reset();
        doctorModal.style.display = 'flex';
    }
    
    // Cerrar modales
    function closeModal() {
        appointmentModal.style.display = 'none';
        doctorModal.style.display = 'none';
    }
    
    // Manejar envío del formulario de cita
    function handleFormSubmit(e) {
        e.preventDefault();
        
        const doctorId = doctorSelect.value;
        const patientName = document.getElementById('patientName').value.trim();
        const date = document.getElementById('appointmentDate').value;
        const time = document.getElementById('appointmentTime').value;
        const reason = document.getElementById('appointmentReason').value.trim();
        
        // Validaciones
        if (!doctorId || !patientName || !date || !time || !reason) {
            showNotification('Por favor complete todos los campos', 'error');
            return;
        }
        
        // Verificar duplicados (mismo doctor, mismo paciente, misma fecha y hora)
        const isDuplicate = appointments.some(app => {
            return app.doctorId === doctorId && 
                   app.patientName === patientName && 
                   app.date === date && 
                   app.time === time && 
                   (!isEditing || app.id !== currentEditingId);
        });
        
        if (isDuplicate) {
            showNotification('Ya existe una cita para este paciente con el mismo doctor en la misma fecha y hora', 'error');
            return;
        }
        
        // Verificar disponibilidad del doctor
        const doctorAppointments = appointments.filter(app => 
            app.doctorId === doctorId && 
            app.date === date && 
            app.time === time &&
            (!isEditing || app.id !== currentEditingId)
        );
        
        if (doctorAppointments.length > 0) {
            showNotification('El doctor ya tiene una cita programada en ese horario', 'error');
            return;
        }
        
        const appointmentData = {
            id: isEditing ? currentEditingId : Date.now().toString(),
            doctorId,
            patientName,
            date,
            time,
            reason,
            createdAt: new Date().toISOString()
        };
        
        if (isEditing) {
            // Actualizar cita existente
            appointments = appointments.map(app => 
                app.id === currentEditingId ? appointmentData : app
            );
            showNotification('Cita actualizada correctamente');
        } else {
            // Agregar nueva cita
            appointments.push(appointmentData);
            showNotification('Cita agregada correctamente');
        }
        
        saveAppointments();
        if (currentView === 'list') {
            renderAppointmentsList();
        } else {
            renderCalendar();
        }
        closeModal();
    }
    
    // Manejar envío del formulario de doctor
    function handleDoctorFormSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('doctorName').value.trim();
        const specialty = document.getElementById('doctorSpecialty').value.trim();
        const color = document.getElementById('doctorColor').value;
        
        if (!name || !specialty) {
            showNotification('Por favor complete todos los campos', 'error');
            return;
        }
        
        const doctorData = {
            id: Date.now().toString(),
            name: name.startsWith('Dr.') ? name : `Dr. ${name}`,
            specialty,
            color
        };
        
        doctors.push(doctorData);
        saveDoctors();
        renderDoctorsTabs();
        showNotification('Doctor agregado correctamente');
        closeModal();
    }
    
    // Manejar búsqueda
    function handleSearch() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const filteredAppointments = getFilteredAppointments(searchTerm);
        
        if (currentView === 'list') {
            renderAppointmentsList(filteredAppointments);
        } else {
            // En vista de calendario, resaltar los días con coincidencias
            renderCalendar(filteredAppointments);
        }
    }
    
    // Obtener citas filtradas
    function getFilteredAppointments(searchTerm = '') {
        if (!searchTerm) {
            return appointments.filter(app => app.doctorId === currentDoctorId);
        }
        
        return appointments.filter(app => 
            app.doctorId === currentDoctorId &&
            (app.patientName.toLowerCase().includes(searchTerm) ||
             app.date.includes(searchTerm) ||
             app.reason.toLowerCase().includes(searchTerm))
        );
    }
    
    // Eliminar cita
    function deleteAppointment(id) {
        if (confirm('¿Está seguro que desea eliminar esta cita?')) {
            appointments = appointments.filter(app => app.id !== id);
            saveAppointments();
            
            if (currentView === 'list') {
                renderAppointmentsList();
            } else {
                renderCalendar();
            }
            
            showNotification('Cita eliminada correctamente');
        }
    }
    
    // Guardar citas en localStorage
    function saveAppointments() {
        localStorage.setItem('medicalAppointments', JSON.stringify(appointments));
    }
    
    // Guardar doctores en localStorage
    function saveDoctors() {
        localStorage.setItem('medicalDoctors', JSON.stringify(doctors));
    }
    
    // Mostrar notificación
    function showNotification(message, type = 'success') {
        notification.textContent = message;
        notification.className = 'notification show';
        if (type === 'error') notification.classList.add('error');
        
        setTimeout(() => {
            notification.className = 'notification';
        }, 3000);
    }
    
    // Renderizar lista de citas
    function renderAppointmentsList(appointmentsToRender = null) {
        const appointmentsToShow = appointmentsToRender || getFilteredAppointments();
        
        if (appointmentsToShow.length === 0) {
            appointmentsList.innerHTML = '<p class="no-appointments">No hay citas programadas</p>';
            return;
        }
        
        // Ordenar citas por fecha y hora
        const sortedAppointments = [...appointmentsToShow].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });
        
        appointmentsList.innerHTML = sortedAppointments.map(appointment => {
            const doctor = doctors.find(d => d.id === appointment.doctorId);
            return `
                <div class="appointment-card">
                    <div class="appointment-header">
                        <h3 class="appointment-title">${appointment.patientName}</h3>
                        <span class="appointment-time">${formatDate(appointment.date)} - ${appointment.time}</span>
                    </div>
                    <p class="appointment-reason">${appointment.reason}</p>
                    <div class="appointment-meta">
                        <span class="appointment-doctor" style="color: ${doctor?.color || '#4a6fa5'}">
                            <i class="fas fa-user-md"></i> ${doctor?.name || 'Doctor no encontrado'}
                        </span>
                    </div>
                    <div class="appointment-actions">
                        <button class="btn-secondary" onclick="openEditAppointmentModal('${appointment.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-danger" onclick="deleteAppointment('${appointment.id}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Renderizar calendario
    function renderCalendar(filteredAppointments = null) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Establecer el título del mes
        currentMonthEl.textContent = new Date(year, month).toLocaleDateString('es-ES', {
            month: 'long',
            year: 'numeric'
        }).toUpperCase();
        
        // Obtener primer día del mes y último día del mes
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // Obtener día de la semana del primer día (0 = Domingo, 1 = Lunes, etc.)
        const firstDayOfWeek = firstDay.getDay();
        
        // Crear encabezados de días
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        let calendarHTML = dayNames.map(day => `
            <div class="calendar-day-header">${day}</div>
        `).join('');
        
        // Agregar celdas vacías para días del mes anterior
        for (let i = 0; i < firstDayOfWeek; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }
        
        // Obtener citas para el doctor actual
        const doctorAppointments = filteredAppointments || getFilteredAppointments();
        
        // Agregar días del mes
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            const dateStr = formatDateForStorage(date);
            
            const isToday = date.getTime() === today.getTime();
            const dayAppointments = doctorAppointments.filter(app => app.date === dateStr);
            
            let dayHTML = `
                <div class="calendar-day ${isToday ? 'today' : ''}">
                    <div class="calendar-day-number">${day}</div>
            `;
            
            dayAppointments.forEach(app => {
                const doctor = doctors.find(d => d.id === app.doctorId);
                dayHTML += `
                    <div class="calendar-event" 
                         style="background-color: ${doctor?.color || '#4a6fa5'}; color: white"
                         onclick="openEditAppointmentModal('${app.id}')">
                        ${app.time} - ${app.patientName}
                    </div>
                `;
            });
            
            dayHTML += '</div>';
            calendarHTML += dayHTML;
        }
        
        calendarGrid.innerHTML = calendarHTML;
    }
    
    // Verificar citas próximas
    function checkUpcomingAppointments() {
        const now = new Date();
        const inFiveMinutes = new Date(now.getTime() + 5 * 60000);
        
        appointments.forEach(app => {
            const appointmentTime = new Date(`${app.date}T${app.time}`);
            
            // Verificar si la cita está dentro de 5 minutos
            if (appointmentTime > now && appointmentTime <= inFiveMinutes) {
                const doctor = doctors.find(d => d.id === app.doctorId);
                const minutes = Math.round((appointmentTime - now) / 60000);
                
                showBrowserNotification(
                    `Cita próxima con ${app.patientName}`,
                    `En ${minutes} minuto(s) con ${doctor?.name || 'el doctor'}`,
                    doctor?.color
                );
            }
        });
    }
    
    // Mostrar notificación del navegador
    function showBrowserNotification(title, body, color = '#4a6fa5') {
        // Verificar si las notificaciones están soportadas y permitidas
        if (!('Notification' in window)) {
            console.log('Este navegador no soporta notificaciones');
            return;
        }
        
        if (Notification.permission === 'granted') {
            createNotification(title, body, color);
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    createNotification(title, body, color);
                }
            });
        }
    }
    
    // Crear notificación
    function createNotification(title, body, color) {
        const options = {
            body,
            icon: 'icon-192x192.png',
            badge: 'icon-192x192.png',
            vibrate: [200, 100, 200],
            tag: 'appointment-reminder'
        };
        
        if (color) {
            options.data = { primaryColor: color };
        }
        
        new Notification(title, options);
    }
    
    // Formatear fecha para mostrar
    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    }
    
    // Formatear fecha para almacenamiento (YYYY-MM-DD)
    function formatDateForStorage(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Hacer funciones disponibles globalmente para los eventos onclick en HTML
    window.openEditAppointmentModal = function(id) {
        const appointment = appointments.find(app => app.id === id);
        if (!appointment) return;
        
        isEditing = true;
        currentEditingId = id;
        modalTitle.textContent = 'Editar Cita';
        
        document.getElementById('appointmentId').value = id;
        document.getElementById('appointmentDoctor').value = appointment.doctorId;
        document.getElementById('patientName').value = appointment.patientName;
        document.getElementById('appointmentDate').value = appointment.date;
        document.getElementById('appointmentTime').value = appointment.time;
        document.getElementById('appointmentReason').value = appointment.reason;
        
        appointmentModal.style.display = 'flex';
    };
    
    window.deleteAppointment = deleteAppointment;
    
    // Iniciar la aplicación
    init();
});