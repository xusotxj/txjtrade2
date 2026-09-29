"use strict";


/* =====================================================
   CONFIGURACIÓN
===================================================== */

const STORAGE_KEY = "disciplina_app_data_v2";
const THEME_KEY = "disciplina_app_theme_v2";


/* =====================================================
   ESTADO
===================================================== */

let state = loadData();

let selectedDate = getDateKey(new Date());

let toastTimeout = null;


/* =====================================================
   ATAJO PARA SELECTORES
===================================================== */

function $(selector) {
    return document.querySelector(selector);
}


/* =====================================================
   FECHAS
===================================================== */

function getDateKey(date) {

    const d = new Date(date);

    const year = d.getFullYear();

    const month = String(
        d.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        d.getDate()
    ).padStart(2, "0");

    return year + "-" + month + "-" + day;
}


function parseDate(key) {

    const parts = key.split("-");

    return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );
}


function todayKey() {

    return getDateKey(new Date());

}


function changeDate(key, amount) {

    const date = parseDate(key);

    date.setDate(
        date.getDate() + amount
    );

    return getDateKey(date);
}


function formatDate(key) {

    return parseDate(key).toLocaleDateString(
        "es-ES",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        }
    );

}


/* =====================================================
   DATOS
===================================================== */

function loadData() {

    const defaultData = {
        tasks: [],
        completions: {}
    };


    try {

        const saved =
            localStorage.getItem(
                STORAGE_KEY
            );


        if (!saved) {

            return defaultData;

        }


        const data =
            JSON.parse(saved);


        if (
            !data ||
            !Array.isArray(data.tasks) ||
            typeof data.completions !== "object"
        ) {

            return defaultData;

        }


        return data;

    } catch (error) {

        console.error(
            "Error leyendo los datos:",
            error
        );

        return defaultData;

    }

}


function saveData() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(state)
        );

    } catch (error) {

        console.error(
            "Error guardando los datos:",
            error
        );

        showToast(
            "No se pudieron guardar los datos."
        );

    }

}


/* =====================================================
   COMPLETAR TAREAS
===================================================== */

function isTaskCompleted(
    taskId,
    date
) {

    if (!state.completions[taskId]) {

        return false;

    }


    return Boolean(
        state.completions[taskId][date]
    );

}


function setTaskCompleted(
    taskId,
    date,
    completed
) {

    if (!state.completions[taskId]) {

        state.completions[taskId] = {};

    }


    if (completed) {

        state.completions[taskId][date] = true;

    } else {

        delete state.completions[taskId][date];

    }


    saveData();

}


/* =====================================================
   RACHAS INDIVIDUALES
===================================================== */

function getCurrentStreak(taskId) {

    /*
        IMPORTANTE:

        La racha se calcula empezando por HOY.

        Ejemplo:

        lunes  ✓
        martes ✓
        miércoles ✓
        jueves ✕

        La racha actual = 0

        Si hoy es miércoles:

        lunes  ✓
        martes ✓
        miércoles ✓

        La racha actual = 3
    */


    let streak = 0;

    let date = todayKey();


    while (
        isTaskCompleted(
            taskId,
            date
        )
    ) {

        streak++;

        date = changeDate(
            date,
            -1
        );

    }


    return streak;

}


function getBestStreak(taskId) {

    const completions =
        state.completions[taskId];


    if (!completions) {

        return 0;

    }


    const dates =
        Object.keys(completions)
            .filter(
                function (date) {
                    return completions[date] === true;
                }
            )
            .sort();


    if (dates.length === 0) {

        return 0;

    }


    let best = 1;

    let current = 1;


    for (
        let i = 1;
        i < dates.length;
        i++
    ) {

        const previous =
            dates[i - 1];

        const currentDate =
            dates[i];


        if (
            changeDate(
                previous,
                1
            ) === currentDate
        ) {

            current++;

        } else {

            current = 1;

        }


        if (current > best) {

            best = current;

        }

    }


    return best;

}


/* =====================================================
   RACHA GLOBAL
===================================================== */

function getGlobalStreak() {

    if (state.tasks.length === 0) {

        return 0;

    }


    let streak = 0;

    let date = todayKey();


    while (true) {

        const allCompleted =
            state.tasks.every(
                function (task) {

                    return isTaskCompleted(
                        task.id,
                        date
                    );

                }
            );


        if (!allCompleted) {

            break;

        }


        streak++;

        date = changeDate(
            date,
            -1
        );

    }


    return streak;

}


function getBestGlobalStreak() {

    if (state.tasks.length === 0) {

        return 0;

    }


    const activityDates =
        getActivityDates();


    if (activityDates.length === 0) {

        return 0;

    }


    let best = 0;

    let current = 0;


    let date =
        activityDates[0];


    const last =
        activityDates[
            activityDates.length - 1
        ];


    while (date <= last) {

        const complete =
            state.tasks.every(
                function (task) {

                    return isTaskCompleted(
                        task.id,
                        date
                    );

                }
            );


        if (complete) {

            current++;

            if (current > best) {

                best = current;

            }

        } else {

            current = 0;

        }


        date = changeDate(
            date,
            1
        );

    }


    return best;

}


/* =====================================================
   ACTIVIDAD
===================================================== */

function getActivityDates() {

    const dates = new Set();


    Object.keys(
        state.completions
    ).forEach(
        function (taskId) {

            const completion =
                state.completions[
                    taskId
                ];


            Object.keys(
                completion
            ).forEach(
                function (date) {

                    if (
                        completion[date]
                    ) {

                        dates.add(date);

                    }

                }
            );

        }
    );


    return Array.from(
        dates
    ).sort();

}


/* =====================================================
   ESTADÍSTICAS DEL DÍA
===================================================== */

function getDayStats(date) {

    const total =
        state.tasks.length;


    let completed = 0;


    state.tasks.forEach(
        function (task) {

            if (
                isTaskCompleted(
                    task.id,
                    date
                )
            ) {

                completed++;

            }

        }
    );


    let percentage = 0;


    if (total > 0) {

        percentage =
            Math.round(
                (completed / total) * 100
            );

    }


    return {
        total: total,
        completed: completed,
        percentage: percentage
    };

}


/* =====================================================
   RENDER PRINCIPAL
===================================================== */

function render() {

    renderDate();

    renderTasks();

    renderStatistics();

    renderStreaks();

    renderHistory();

}


/* =====================================================
   FECHA
===================================================== */

function renderDate() {

    const today =
        todayKey();


    const title =
        $("#dateTitle");


    const subtitle =
        $("#dateSubtitle");


    if (
        selectedDate === today
    ) {

        title.textContent =
            "Hoy";

    } else if (
        selectedDate ===
        changeDate(today, -1)
    ) {

        title.textContent =
            "Ayer";

    } else {

        title.textContent =
            formatDate(
                selectedDate
            );

    }


    subtitle.textContent =
        formatDate(
            selectedDate
        );

}


/* =====================================================
   TAREAS
===================================================== */

function renderTasks() {

    const container =
        $("#tasksContainer");


    const empty =
        $("#emptyState");


    container.innerHTML = "";


    if (
        state.tasks.length === 0
    ) {

        empty.classList.remove(
            "hidden"
        );

        return;

    }


    empty.classList.add(
        "hidden"
    );


    const tasks =
        state.tasks.slice();


    tasks.sort(
        function (a, b) {

            if (!a.time) {

                return 1;

            }


            if (!b.time) {

                return -1;

            }


            return a.time.localeCompare(
                b.time
            );

        }
    );


    tasks.forEach(
        function (task) {

            const completed =
                isTaskCompleted(
                    task.id,
                    selectedDate
                );


            const element =
                document.createElement(
                    "article"
                );


            element.className =
                "task";


            if (completed) {

                element.classList.add(
                    "done"
                );

            }


            element.innerHTML =

                '<button class="check">' +

                (
                    completed
                        ? "✓"
                        : ""
                ) +

                "</button>" +


                "<div>" +

                '<div class="task-name">' +

                escapeHTML(
                    task.name
                ) +

                "</div>" +


                '<div class="task-meta">' +

                (
                    task.time
                        ? '<span class="task-time">◷ ' +
                          escapeHTML(
                              task.time
                          ) +
                          "</span>"
                        : ""
                ) +


                '<span class="tag">' +

                escapeHTML(
                    task.category
                ) +

                "</span>" +


                (
                    task.note
                        ? '<span class="task-note">· ' +
                          escapeHTML(
                              task.note
                          ) +
                          "</span>"
                        : ""
                ) +

                "</div>" +

                "</div>" +


                '<div class="task-actions">' +

                '<button class="edit">✎</button>' +

                '<button class="delete">×</button>' +

                "</div>";


            const check =
                element.querySelector(
                    ".check"
                );


            check.addEventListener(
                "click",
                function () {

                    setTaskCompleted(
                        task.id,
                        selectedDate,
                        !completed
                    );


                    render();


                    if (!completed) {

                        showToast(
                            "✓ Disciplina completada"
                        );

                    }

                }
            );


            const edit =
                element.querySelector(
                    ".edit"
                );


            edit.addEventListener(
                "click",
                function () {

                    openModal(task);

                }
            );


            const remove =
                element.querySelector(
                    ".delete"
                );


            remove.addEventListener(
                "click",
                function () {

                    deleteTask(
                        task.id
                    );

                }
            );


            container.appendChild(
                element
            );

        }
    );

}


/* =====================================================
   ESTADÍSTICAS
===================================================== */

function renderStatistics() {

    const stats =
        getDayStats(
            selectedDate
        );


    $("#percentage")
        .textContent =
        stats.percentage + "%";


    $("#progressCircle")
        .style
        .setProperty(
            "--progress",
            stats.percentage + "%"
        );


    $("#progressBar")
        .style
        .width =
        stats.percentage + "%";


    $("#completedTasks")
        .textContent =
        stats.completed +
        "/" +
        stats.total;


    $("#globalStreak")
        .textContent =
        getGlobalStreak();


    $("#globalRecord")
        .textContent =
        getBestGlobalStreak();


    $("#activeDays")
        .textContent =
        getActivityDates().length;


    let status =
        "Empieza el día.";


    let message =
        "Una tarea hecha es mejor que diez pensadas.";


    if (
        stats.total > 0 &&
        stats.percentage === 100
    ) {

        status =
            "Día completado. 🔥";


        message =
            "Lo hiciste. Ahora protege la racha.";

    } else if (
        stats.percentage >= 75
    ) {

        status =
            "Ya casi está.";


        message =
            "No pares ahora.";

    } else if (
        stats.percentage > 0
    ) {

        status =
            "En movimiento.";


        message =
            "Cada casilla que marcas cuenta.";

    }


    $("#dayStatus")
        .textContent =
        status;


    $("#dayMessage")
        .textContent =
        message;

}


/* =====================================================
   RACHAS
===================================================== */

function renderStreaks() {

    const container =
        $("#streaksContainer");


    container.innerHTML = "";


    if (
        state.tasks.length === 0
    ) {

        container.innerHTML =
            '<p style="color:#777;font-size:11px;">' +
            "Añade disciplinas para ver tus rachas." +
            "</p>";

        return;

    }


    state.tasks.forEach(
        function (task) {

            const current =
                getCurrentStreak(
                    task.id
                );


            const record =
                getBestStreak(
                    task.id
                );


            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "streak";


            element.innerHTML =

                '<div class="streak-icon">' +

                getCategoryIcon(
                    task.category
                ) +

                "</div>" +


                "<div>" +

                '<div class="streak-name">' +

                escapeHTML(
                    task.name
                ) +

                "</div>" +


                '<div class="streak-record">' +

                "récord: " +

                record +

                " día" +

                (
                    record === 1
                        ? ""
                        : "s"
                ) +

                "</div>" +

                "</div>" +


                '<div class="streak-number">' +

                current +

                '<small>d</small>' +

                "</div>";


            container.appendChild(
                element
            );

        }
    );

}


/* =====================================================
   HISTORIAL
===================================================== */

function renderHistory() {

    const container =
        $("#historyContainer");


    container.innerHTML = "";


    for (
        let i = 13;
        i >= 0;
        i--
    ) {

        const date =
            changeDate(
                todayKey(),
                -i
            );


        const stats =
            getDayStats(
                date
            );


        let className =
            "";


        if (
            stats.total > 0 &&
            stats.completed === stats.total
        ) {

            className =
                "complete";

        } else if (
            stats.completed > 0
        ) {

            className =
                "partial";

        }


        if (
            date === todayKey()
        ) {

            className += " today";

        }


        const element =
            document.createElement(
                "div"
            );


        element.className =
            "history-day";


        const dayName =
            parseDate(date)
                .toLocaleDateString(
                    "es-ES",
                    {
                        weekday: "narrow"
                    }
                );


        element.innerHTML =

            '<div class="history-name">' +

            dayName +

            "</div>" +


            '<div class="history-dot ' +

            className +

            '" title="' +

            date +

            ": " +

            stats.completed +

            "/" +

            stats.total +

            '"></div>';


        element.addEventListener(
            "click",
            function () {

                selectedDate =
                    date;

                render();

            }
        );


        container.appendChild(
            element
        );

    }

}


/* =====================================================
   ICONOS
===================================================== */

function getCategoryIcon(category) {

    const icons = {

        "Salud": "♡",

        "Entrenamiento": "◈",

        "Trabajo": "⌁",

        "Estudio": "⌘",

        "Hábitos": "↻",

        "Personal": "✦"

    };


    return (
        icons[category] ||
        "✦"
    );

}


/* =====================================================
   MODAL
===================================================== */

function openModal(task) {

    $("#modal")
        .classList
        .remove("hidden");


    $("#taskId")
        .value =
        task
            ? task.id
            : "";


    $("#taskName")
        .value =
        task
            ? task.name
            : "";


    $("#taskTime")
        .value =
        task
            ? task.time
            : "08:00";


    $("#taskCategory")
        .value =
        task
            ? task.category
            : "Hábitos";


    $("#taskNote")
        .value =
        task
            ? task.note
            : "";


    $("#modalTitle")
        .textContent =
        task
            ? "Edita tu disciplina."
            : "Añade algo que quieras cumplir.";


    setTimeout(
        function () {

            $("#taskName").focus();

        },
        50
    );

}


function closeModal() {

    $("#modal")
        .classList
        .add("hidden");


    $("#taskForm")
        .reset();

}


/* =====================================================
   GUARDAR TAREA
===================================================== */

$("#taskForm")
    .addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const id =
                $("#taskId").value ||
                createId();


            const name =
                $("#taskName")
                    .value
                    .trim();


            if (!name) {

                return;

            }


            const existing =
                state.tasks.find(
                    function (task) {

                        return task.id === id;

                    }
                );


            const task = {

                id: id,

                name: name,

                time:
                    $("#taskTime").value,

                category:
                    $("#taskCategory").value,

                note:
                    $("#taskNote")
                        .value
                        .trim()

            };


            if (existing) {

                existing.name =
                    task.name;

                existing.time =
                    task.time;

                existing.category =
                    task.category;

                existing.note =
                    task.note;

            } else {

                state.tasks.push(
                    task
                );

            }


            saveData();

            closeModal();

            render();


            showToast(
                existing
                    ? "Disciplina actualizada."
                    : "Disciplina creada."
            );

        }
    );


/* =====================================================
   ELIMINAR
===================================================== */

function deleteTask(id) {

    const task =
        state.tasks.find(
            function (item) {

                return item.id === id;

            }
        );


    if (!task) {

        return;

    }


    const confirmed =
        confirm(
            '¿Quieres eliminar "' +
            task.name +
            '"?'
        );


    if (!confirmed) {

        return;

    }


    state.tasks =
        state.tasks.filter(
            function (item) {

                return item.id !== id;

            }
        );


    delete state.completions[id];


    saveData();

    render();


    showToast(
        "Disciplina eliminada."
    );

}


/* =====================================================
   ID
===================================================== */

function createId() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 9)
    );

}


/* =====================================================
   ESCAPAR HTML
===================================================== */

function escapeHTML(value) {

    return String(
        value || ""
    ).replace(
        /[&<>"']/g,
        function (character) {

            const characters = {

                "&": "&amp;",

                "<": "&lt;",

                ">": "&gt;",

                '"': "&quot;",

                "'": "&#039;"

            };


            return characters[
                character
            ];

        }
    );

}


/* =====================================================
   NOTIFICACIÓN
===================================================== */

function showToast(message) {

    const toast =
        $("#toast");


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        toastTimeout
    );


    toastTimeout =
        setTimeout(
            function () {

                toast.classList.remove(
                    "show"
                );

            },
            2200
        );

}


/* =====================================================
   BOTONES
===================================================== */

$("#addTaskButton")
    .addEventListener(
        "click",
        function () {

            openModal();

        }
    );


$("#firstTaskButton")
    .addEventListener(
        "click",
        function () {

            openModal();

        }
    );


$("#closeModal")
    .addEventListener(
        "click",
        closeModal
    );


$("#cancelModal")
    .addEventListener(
        "click",
        closeModal
    );


$("#modal")
    .addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                $("#modal")
            ) {

                closeModal();

            }

        }
    );


$("#previousDay")
    .addEventListener(
        "click",
        function () {

            selectedDate =
                changeDate(
                    selectedDate,
                    -1
                );

            render();

        }
    );


$("#nextDay")
    .addEventListener(
        "click",
        function () {

            const next =
                changeDate(
                    selectedDate,
                    1
                );


            if (
                next <= todayKey()
            ) {

                selectedDate =
                    next;

                render();

            } else {

                showToast(
                    "No puedes registrar días futuros."
                );

            }

        }
    );


/* =====================================================
   TEMA
===================================================== */

$("#themeButton")
    .addEventListener(
        "click",
        function () {

            document.body.classList.toggle(
                "light"
            );


            const light =
                document.body.classList.contains(
                    "light"
                );


            localStorage.setItem(
                THEME_KEY,
                light
                    ? "light"
                    : "dark"
            );

        }
    );


/* =====================================================
   RESTABLECER
===================================================== */

$("#resetButton")
    .addEventListener(
        "click",
        function () {

            const confirmed =
                confirm(
                    "Se borrarán todas las tareas, rachas e historial. ¿Continuar?"
                );


            if (!confirmed) {

                return;

            }


            localStorage.removeItem(
                STORAGE_KEY
            );


            state =
                loadData();


            selectedDate =
                todayKey();


            render();


            showToast(
                "Datos restablecidos."
            );

        }
    );


/* =====================================================
   TEMA INICIAL
===================================================== */

const savedTheme =
    localStorage.getItem(
        THEME_KEY
    );


if (
    savedTheme === "light"
) {

    document.body.classList.add(
        "light"
    );

}


/* =====================================================
   INICIAR APP
===================================================== */

render();