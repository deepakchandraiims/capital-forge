from pathlib import Path
import re


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def rep(path, old, new, label, count=1):
    t = read(path)
    n = t.count(old)
    if n < count:
        raise SystemExit(f"BLOCKED {label}: expected >= {count}, found {n} in {path}")
    write(path, t.replace(old, new, count))


def rex(path, pattern, repl, label, flags=re.S):
    t = read(path)
    nt, n = re.subn(pattern, repl, t, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f"BLOCKED {label}: matches={n} in {path}")
    write(path, nt)


def ensure_router_import(path):
    t = read(path)
    if re.search(r'import\s*\{[^}]*\buseRouter\b[^}]*\}\s*from\s*"next/navigation"', t):
        return
    m = re.search(r'import\s*\{([^}]*)\}\s*from\s*"next/navigation";', t)
    if m:
        names = m.group(1).strip()
        t = t[:m.start()] + f'import {{ {names}, useRouter }} from "next/navigation";' + t[m.end():]
    else:
        original = t
        lines = t.splitlines()
        idx = next((i for i, x in enumerate(lines) if x.startswith('import ') and 'react' in x), None)
        if idx is None:
            raise SystemExit(f"BLOCKED router import anchor in {path}")
        lines.insert(idx + 1, 'import { useRouter } from "next/navigation";')
        t = '\n'.join(lines) + ('\n' if original.endswith('\n') else '')
    write(path, t)


def insert_default_router(path, extra=''):
    t = read(path)
    m = re.search(r'(export default function [^\n]+\{\n)', t)
    if not m:
        raise SystemExit(f"BLOCKED default component anchor in {path}")
    window = t[m.end():m.end() + 180]
    if 'const router=useRouter();' in window or 'const router = useRouter();' in window:
        return
    t = t[:m.end()] + '  const router=useRouter();\n' + extra + t[m.end():]
    write(path, t)


def replace_assigns(path):
    t = read(path).replace('window.location.assign(', 'router.push(').replace('location.assign(', 'router.push(')
    write(path, t)


Path('app/SharedAppSidebar.tsx').write_text('''"use client";

import { useRouter } from "next/navigation";
import { PRIMARY_NAV, NAV_ICONS, routeForNav, type PrimaryNavLabel } from "./navigation";

export default function SharedAppSidebar({active, title="Capital Forge", note="Institutional finance workstation"}:{active:PrimaryNavLabel;title?:string;note?:string}) {
  const router=useRouter();
  return <aside className="cf-shared-sidebar" aria-label="Capital Forge navigation">
    <nav>{PRIMARY_NAV.map(tab=>{const route=routeForNav(tab);return <button key={tab} className={tab===active?"active":""} aria-current={tab===active?"page":undefined} onClick={()=>{if(route)router.push(route)}}><span>{NAV_ICONS[tab]}</span>{tab}</button>})}</nav>
    <div className="cf-shared-sidebar-card"><b>{title}</b><p>{note}</p></div>
    <div className="cf-shared-sidebar-foot">Capital Forge · Shared Navigation</div>
  </aside>;
}
''')

css = read('app/globals.css')
marker = '/* CF-051 SHARED SHELL */'
if marker not in css:
    css += '''\n\n/* CF-051 SHARED SHELL */
.cf-shared-sidebar{position:fixed;left:0;top:70px;bottom:0;width:220px;z-index:19;background:#fff;border-right:1px solid #e4eaf2;padding:18px 13px;display:flex;flex-direction:column;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.cf-shared-sidebar nav{display:grid;gap:8px}.cf-shared-sidebar nav button{width:100%;height:44px;border:0;border-radius:9px;background:transparent;color:#17253b;display:flex;align-items:center;gap:14px;padding:0 14px;text-align:left;font-size:14px;font-weight:650;cursor:pointer}.cf-shared-sidebar nav button span{width:20px;text-align:center;font-size:18px}.cf-shared-sidebar nav button:hover{background:#f4f7fb}.cf-shared-sidebar nav button.active{background:linear-gradient(135deg,#0b67f6,#167bff);color:#fff;box-shadow:0 9px 18px rgba(8,117,250,.16)}
.cf-shared-sidebar-card{margin-top:auto;border:1px solid #e3e9f1;border-radius:11px;padding:14px;background:#fbfdff}.cf-shared-sidebar-card b{font-size:13px}.cf-shared-sidebar-card p{margin:6px 0 0;color:#65738a;font-size:10px;line-height:1.5}.cf-shared-sidebar-foot{padding:14px 4px 0;color:#7a8799;font-size:9px}
.markets-app .markets-shell{margin-left:220px!important;width:calc(100% - 220px)!important;max-width:none!important}.cf-shell-main-with-sidebar{margin-left:220px!important;margin-right:0!important;max-width:none!important}
@media(max-width:900px){.cf-shared-sidebar{width:190px}.markets-app .markets-shell{margin-left:190px!important;width:calc(100% - 190px)!important}.cf-shell-main-with-sidebar{margin-left:190px!important}}
'''
    write('app/globals.css', css)

# Home
p = 'app/home/page.tsx'
ensure_router_import(p)
rex(p, r'\nfunction nav\(tab:string\)\{.*?\n\}\nfunction openMarket\(symbol:string,name\?:string\)\{.*?\n\}\n(?=function ensureFive)', '\n', 'home module navigation helpers')
insert_default_router(p, '  function nav(tab:string){const route=routeForNav(tab);if(route)router.push(route);}\n  function openMarket(symbol:string,name?:string){const params=new URLSearchParams({symbol});if(name)params.set("name",name);router.push(`/markets?${params.toString()}`);}\n')
replace_assigns(p)

# Cases
p = 'app/cases/page.tsx'
ensure_router_import(p)
rex(p, r'\nfunction go\(tab: string\) \{.*?\n\}\n(?=function pickText)', '\n', 'cases module go')
insert_default_router(p, '  function go(tab:string){const route=routeForNav(tab);if(route)router.push(route);}\n')
replace_assigns(p)

# Advanced
p = 'app/advanced/page.tsx'
ensure_router_import(p)
rex(p, r'\nfunction go\(tab:string\) \{ const route=routeForNav\(tab\); if\(route\) window\.location\.assign\(route\); \}\n', '\n', 'advanced module go')
insert_default_router(p, '  function go(tab:string){const route=routeForNav(tab);if(route)router.push(route);}\n')
replace_assigns(p)

# Practice
p = 'app/practice/page.tsx'
ensure_router_import(p)
rex(p, r'\nfunction go\(tab:string\)\{.*?\n\}\n(?=function pretty)', '\n', 'practice module go')
insert_default_router(p, '  function go(tab:string){const route=routeForNav(tab);if(route)router.push(route);}\n')
replace_assigns(p)

# Dashboard
p = 'app/dashboard/page.tsx'
ensure_router_import(p)
rex(p, r'\nfunction go\(tab:string, focus\?:string\)\{.*?\n\}\n(?=function rangeBounds)', '\n', 'dashboard module go')
insert_default_router(p, '  function go(tab:string,focus?:string){if(focus)localStorage.setItem("capital-forge-focus-practice-v1",JSON.stringify({topic:focus,createdAt:new Date().toISOString()}));const route=routeForNav(tab);if(route)router.push(route);}\n')
replace_assigns(p)

# Knowledge dashboard
p = 'app/dashboard/knowledge-vault/page.tsx'
ensure_router_import(p)
rex(p, r'\nfunction go\(tab:string\)\{.*?\n\}\n(?=function clientKey)', '\n', 'knowledge dashboard module go')
insert_default_router(p, '  function go(tab:string){const route=routeForNav(tab);if(route)router.push(route);}\n')
replace_assigns(p)

# Feedback
p = 'app/feedback/page.tsx'
ensure_router_import(p)
rex(p, r'\nfunction routeTo\(tab:string\)\{.*?\n\}\n(?=function scoreTone)', '\n', 'feedback module routeTo')
insert_default_router(p, '  function routeTo(tab:string){const route=routeForNav(tab);if(route)router.push(route);}\n')
replace_assigns(p)

# Interview room
p = 'app/interview/page.tsx'
ensure_router_import(p)
rex(p, r'\nfunction nav\(tab:string\)\{.*?\n\}\n(?=function scoreTone)', '\n', 'interview module nav')
insert_default_router(p, '  function nav(tab:string){const route=routeForNav(tab);if(route)router.push(route);}\n')
replace_assigns(p)

# Vault shell
p = 'app/knowledge-vault/KnowledgeVaultShell.tsx'
ensure_router_import(p)
rex(p, r'\nfunction go\(tab: string\) \{.*?\n\}\n\n(?=export default function KnowledgeVaultShell)', '\n', 'vault shell module go')
insert_default_router(p, '  function go(tab:string){const route=routeForNav(tab);if(route)router.push(route);}\n')
replace_assigns(p)

# Vault landing and renderer
p = 'app/knowledge-vault/page.tsx'
ensure_router_import(p)
insert_default_router(p)
replace_assigns(p)

p = 'app/knowledge-vault/LearningObjectRenderer.tsx'
ensure_router_import(p)
insert_default_router(p)
replace_assigns(p)

# Vault catch-all
p = 'app/knowledge-vault/[...slug]/page.tsx'
ensure_router_import(p)
t = read(p)
patterns = [
    ('export default function KnowledgeVaultRoutePage(){', 'export default function KnowledgeVaultRoutePage(){\n  const router=useRouter();'),
    ('function ObjectView({id}:{id:string}){', 'function ObjectView({id}:{id:string}){\n  const router=useRouter();'),
    ('function Related({object}:{object:Obj}){', 'function Related({object}:{object:Obj}){const router=useRouter();'),
    ('function Learn({category,search}:{category:string;search:string}){', 'function Learn({category,search}:{category:string;search:string}){\n  const router=useRouter();'),
    ('function Universe({slug}:{slug:string}){', 'function Universe({slug}:{slug:string}){\n  const router=useRouter();'),
    ('function QuickScan(){', 'function QuickScan(){\n  const router=useRouter();'),
    ('function Quiz(){', 'function Quiz(){\n  const router=useRouter();'),
    ('function Timeline({search}:{search:string}){', 'function Timeline({search}:{search:string}){const router=useRouter();'),
    ('function Saved(){', 'function Saved(){const router=useRouter();')
]
for old, new in patterns:
    if old not in t:
        raise SystemExit(f'BLOCKED Vault router scope: {old}')
    t = t.replace(old, new, 1)
t = t.replace('window.location.assign(', 'router.push(')
t = t.replace('onClick={()=>history.back()}', 'onClick={()=>router.back()}')
t = t.replace('history.replaceState(null,"",`/knowledge-vault/quiz?count=${count}`);setStarted(true);', 'router.replace(`/knowledge-vault/quiz?count=${count}`,{scroll:false});setStarted(true);')
write(p, t)

# Markets
p = 'app/markets/page.tsx'
ensure_router_import(p)
t = read(p)
anchor = 'import LiveDateTime from "../LiveDateTime";'
if 'SharedAppSidebar' not in t:
    if anchor not in t:
        raise SystemExit('BLOCKED markets import anchor')
    t = t.replace(anchor, anchor + '\nimport SharedAppSidebar from "../SharedAppSidebar";', 1)
write(p, t)
insert_default_router(p)
replace_assigns(p)
rep(p, '    </header>\n\n    <main className="markets-shell">', '    </header>\n    <SharedAppSidebar active="Home" title="Markets" note="Global market data, price history and finance learning links."/>\n\n    <main className="markets-shell">', 'markets shared sidebar')

# Quick Math
p = 'app/practice/quick-math/page.tsx'
ensure_router_import(p)
t = read(p)
anchor = 'import LiveDateTime from "../../LiveDateTime";'
if 'SharedAppSidebar' not in t:
    if anchor not in t:
        raise SystemExit('BLOCKED quick math import anchor')
    t = t.replace(anchor, anchor + '\nimport SharedAppSidebar from "../../SharedAppSidebar";', 1)
write(p, t)
insert_default_router(p)
replace_assigns(p)
rep(p, '    </header>\n\n    <main className={styles.main}>', '    </header>\n    <SharedAppSidebar active="Practice" title="Quick Mathematics" note="Mental speed training inside the Practice workstation."/>\n\n    <main className={`${styles.main} cf-shell-main-with-sidebar`}>', 'quick math shared sidebar')

# Live interview session
p = 'app/interview/session/[id]/page.tsx'
ensure_router_import(p)
insert_default_router(p)
replace_assigns(p)
t = read(p)
if 'function Top(){return ' not in t:
    raise SystemExit('BLOCKED live interview Top')
t = t.replace('function Top(){return ', 'function Top(){const router=useRouter();return ', 1)
write(p, t)

# Interview results
p = 'app/interview/session/[id]/results/page.tsx'
ensure_router_import(p)
insert_default_router(p)
replace_assigns(p)
t = read(p)
if 'function Top(){return ' not in t:
    raise SystemExit('BLOCKED results Top')
t = t.replace('function Top(){return ', 'function Top(){const router=useRouter();return ', 1)
write(p, t)

# Nav bridge
p = 'app/NavRouteBridge.tsx'
ensure_router_import(p)
t = read(p)
old_head = 'export default function NavRouteBridge() {\n  useEffect(() => {\n    let redirecting = false;'
new_head = 'export default function NavRouteBridge() {\n  const router=useRouter();\n  useEffect(() => {\n    let navigatingTo: string | null = null;'
if old_head not in t:
    raise SystemExit('BLOCKED NavRouteBridge head')
t = t.replace(old_head, new_head, 1)
old = '''    const navigate = (route: string, replace = false) => {
      if (redirecting || window.location.pathname === route) return;
      redirecting = true;
      if (replace) window.location.replace(route);
      else window.location.assign(route);
    };'''
new = '''    const navigate = (route: string, replace = false) => {
      const current = `${window.location.pathname}${window.location.search}`;
      if (navigatingTo === route || current === route || (window.location.pathname === route && !route.includes("?"))) return;
      navigatingTo = route;
      if (replace) router.replace(route);
      else router.push(route);
      window.setTimeout(() => { if (navigatingTo === route) navigatingTo = null; }, 120);
    };'''
if old not in t:
    raise SystemExit('BLOCKED NavRouteBridge navigate block')
t = t.replace(old, new, 1)
t = t.replace('if (redirecting || window.location.pathname !== "/") return;', 'if (window.location.pathname !== "/") return;', 1)
t = t.replace('  }, []);\n\n  return null;', '  }, [router]);\n\n  return null;', 1)
write(p, t)

# Hard verification
hits = []
for fp in Path('app').rglob('*'):
    if fp.is_file() and fp.suffix in {'.ts', '.tsx', '.js', '.jsx'}:
        text = fp.read_text()
        for needle in ('window.location.assign(', 'location.assign(', 'window.location.replace('):
            if needle in text:
                hits.append((str(fp), needle))
print('CF051_FULL_DOCUMENT_NAV_HITS', len(hits))
for h in hits:
    print('NAV_HIT', *h)
if hits:
    raise SystemExit('BLOCKED: full-document internal navigation remains')

for route, active in [('app/markets/page.tsx', 'active="Home"'), ('app/practice/quick-math/page.tsx', 'active="Practice"')]:
    text = read(route)
    if 'SharedAppSidebar' not in text or active not in text:
        raise SystemExit(f'BLOCKED shared shell missing {route}')
print('CF051_SHARED_SIDEBARS=PASS')

renderer = read('app/knowledge-vault/LearningObjectRenderer.tsx')
if not all(x in renderer for x in ['/advanced?kvObject=', '&prompt=', '/advanced?topic=']):
    raise SystemExit('BLOCKED contextual Vault deep links')
if '/advanced?prompt=' not in read('app/markets/page.tsx'):
    raise SystemExit('BLOCKED Markets prompt deep link')
print('CF051_CONTEXT_LINKS=PASS')
