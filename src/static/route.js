function sameOrigin(a, b) {
    // https://stackoverflow.com/questions/31374766/javascript-how-to-check-if-a-url-is-same-origin-as-current-page
    const urlA = new URL(a);
    const urlB = new URL(b);
    return urlA.origin === urlB.origin;
}

function get_form_data(obj) {
    const fd = new FormData();
    for (let i in obj) {
        append_form_data(obj[i], fd, i)
    }

    return fd
}

function append_form_data(data, form_data, key) {
    if ((typeof data === 'object' && data !== null && !(data instanceof File)) || Array.isArray(data)) {
        for (const i in data) {
            if ((typeof data[i] === 'object' && data[i] !== null) || Array.isArray(data[i])) {
                append_form_data(data[i], form_data, key + `[${i}]`)
            } else {
                form_data.append(key + `[${i}]`, data[i])
            }
        }
    } else {
        form_data.append(key, data)
    }
}

function post(url, form_data) {
    let res = fetch(url, {
        method: 'POST',
        body: get_form_data(form_data)
    });

    return res;
}

function get(url) {
    let res = fetch(url, {
        method: 'GET'
    });

    return res;
}

function run_script(script) {
    // https://www.cnblogs.com/libin-1/p/6565458.html
    const new_script = document.createElement('script');
    new_script.innerHTML = script.innerHTML;

    const src = script.getAttribute('src');
    if (src) {
        new_script.setAttribute('src', src);
    }

    document.head.appendChild(new_script);
    document.head.removeChild(new_script);
}

var route = new function() {
    this.session_id = null;
    this.curr_url = null;
    this.prev_url = null;
    this.main_navbar = null;

    this.init = function() {
        let session_id = document.getElementById("indexjs").getAttribute('session_id');
        this.main_navbar = document.getElementById('main-navbar');

        this.main_navbar.querySelector('.nav-link.logout').addEventListener('click', () => {
            post('/board/be/login', {
                reqtype: 'logout',
                session_id: session_id,
            }).then(_ => {
                location.href = '/board/info/';
            });
        });

        if (session_id != '') {
            this.session_id = parseInt(session_id);
            this.main_navbar.querySelector('.nav-link.logout').style.display = 'block';
        } else {
            this.main_navbar.querySelector('.nav-link.login').style.display = 'block';
        }

        this.update(0);
    }

    this.go = (url) => {
        window.history.pushState(null, document.title, url);
        this.update(1);
    }

    this.reload = () => {
        this.update(1);
    }

    this.update = function(mode) {
        function PoPState() {
            this.prev_url = location.href;
            let parts = location.href.split('/');
            let page = parts[4];
            if (page.length === 0 || page === 'index') {
                page = 'info';
            }

            let req_path = parts[4];
            for (let i = 5; i < parts.length-1; i++) {
                req_path += `/${parts[i]}`;
            }

            if (page === 'info') {
                req_path = 'info';
            }

            let args = '';
            parts = parts[parts.length - 1].match(/\?([^#]+)/);
            if (parts == null) {
                args = `cache=${new Date().getTime()}`;
            } else {
                args = parts[1] + `&cache=${new Date().getTime()}`
            }
            

            let request_url = `/board/be/${req_path}?${args}`;
            get(request_url).then(response => {
                if (!response.ok) return "";

                return response.text();
            }).then(html => {
                let callback = () => {
                    route.main_navbar.querySelectorAll('li').forEach(el => {
                        let a = el.querySelector('a.active');
                        if (a !== null) {
                            a.classList.remove('active');
                        }
                    });

                    if (page.length !== 0) {
                        route.main_navbar.querySelectorAll(`li.${page}`).forEach(el => {
                            let a = el.querySelector('a');
                            if (a !== null) {
                                a.classList.add('active');
                            }
                        });
                    }

                    routerView.querySelectorAll('a').forEach(el => {
                        el.addEventListener('click', event => {
                            if (sameOrigin(el.getAttribute('href'), localStorage.href)) {
                                event.preventDefault();
                                history.pushState(null, '', el.getAttribute('href'));
                                PoPState();
                            }
                        });
                    });

                    const scripts = routerView.querySelectorAll('script');
                    for (let script of scripts) {
                        run_script(script);
                    }
                };

                routerView.innerHTML = html;
                
                // callback();
                if (document.readyState === 'complete' || document.readyState !== 'loading') {
                    setTimeout(function() {
                        callback();
                    }, 0);
                } else {
                    let handler = function() {
                        document.removeEventListener('DOMContentLoaded', handler, false);
                        // window.removeEventListener('load', handler, false);
                        callback();
                    }
                    document.addEventListener('DOMContentLoaded', handler, false);
                    // window.addEventListener('load', handler, false);
                }
            });
        }

        let routerView = document.getElementById('routerView');

        if (mode == 1) {
            PoPState();
            return;
        }

        window.addEventListener('DOMContentLoaded', onLoad);
        window.addEventListener('popstate', PoPState);

        function onLoad() {
            PoPState();
            let links = document.querySelectorAll('li a[href]');
            links.forEach(link => {
                link.addEventListener('click', event => {
                    event.preventDefault();

                    history.pushState(null, '', link.getAttribute('href'))
                    PoPState()
                })
            })
        }
    }
}