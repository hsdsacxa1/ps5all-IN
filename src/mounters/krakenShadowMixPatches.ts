import { KrakenShadowPatchArtifact } from '../types/mounter';

export const KRAKEN_SHADOW_MIX_PATCHES: KrakenShadowPatchArtifact[] = [
  {
    id: 'launch-stacked-unionfs',
    filename: 'src/main.rs + src/launch.rs',
    targetFileInRepo: 'src/main.rs (wait_ready) + src/launch.rs (Stacked UnionFS)',
    language: 'rust',
    title: '1. Снятие блокировки shadowmountplus.elf (801b98e) + Stacked UnionFS (/app0/kraken)',
    problemSolved:
      'В новом коммите 801b98e в src/main.rs (wait_ready) добавлена жёсткая блокировка запуска при обнаружении процесса shadowmountplus.elf, а в src/launch.rs (строки 716 и 810) при наличии чужого unionfs на common/lib монтирование отменяется ("occupied by unionfs... not mounting"). Патч убирает блокировку shadowmountplus.elf в wait_ready() и накладывает fakelib (libSceAmpr.sprx) поверх слоя ShadowMountPlus (Stacked UnionFS) + монтирует /app0/kraken и /data.',
    content: `// 1A) PATCHED src/main.rs (commit 801b98e): Do NOT block startup when shadowmountplus.elf is running!
fn wait_ready(state: &State) {
    let s = state.settings.lock().unwrap().clone();
    let mut waiting: Option<&str> = None;
    loop {
        if launch::find_pid(SMP_PROCESS).is_some() && waiting.is_none() {
            log!("ShadowMountPlus ({SMP_PROCESS}) detected: KrakenShadow-Mix Stacked UnionFS coexistence active");
        }
        let why = if !sys::kstuff_loaded() {
            Some("kstuff")
        } else {
            None // Removed Some("shadowmount") blocker!
        };
        *state.waiting.lock().unwrap() = why;
        match why {
            None => return,
            Some(w) if waiting != Some(w) => {
                let l = i18n::lang();
                toast(&s, i18n::kstuff_waiting(l));
                waiting = Some(w);
            }
            Some(_) => {}
        }
        std::thread::sleep(Duration::from_secs(2));
    }
}

// 1B) PATCHED src/launch.rs fragment for KrakenShadow-Mix (drop-in replacement for fast_mount & attach)
// Allows ShadowMountPlus v1.7 and Kraken Mount to run AT THE SAME TIME without switching!

    /// Strategy 1 (KrakenShadow-Mix): even if ShadowMountPlus mounted its base unionfs on common/lib,
    /// stack our ampr-emu-ng fakelib unionfs on top of it and mount /data + /app0/kraken!
    fn fast_mount(&mut self, name: &str, tid: &str) {
        let t0 = now_ms();
        tlog!("{tid} sandbox seen: {SANDBOX_ROOT}/{name}");
        self.running.lock().unwrap().insert(tid.to_string());
        if let Some(mut old) = self.sessions.remove(name) {
            tlog!("{tid} stale session on {name}, unmounting it first");
            old.unmount_pass(false);
        }
        let mut s = Session::new(tid);
        if s.srcs.is_empty() {
            tlog!("{tid} empty fakelib, nothing to overlay; not mounting");
            self.sessions.insert(name.to_string(), s);
            return;
        }
        let root = format!("{SANDBOX_ROOT}/{name}");
        loop {
            let waited = now_ms() - t0;
            if let Some(lib) = s.lib.clone().or_else(|| find_lib(name)) {
                s.lib = Some(lib.clone());
                if let Ok(t) = top_mount(&lib) {
                    if t.on == lib {
                        match s.srcs.iter().position(|x| is_our_overlay(&t, x)) {
                            Some(i) if i + 1 == s.srcs.len() => {
                                tlog!("{tid} common/lib already has our overlay: {lib}");
                                s.mount_data(&lib);
                            }
                            Some(i) => {
                                tlog!("{tid} common/lib has our layer {}; mounting the rest", s.srcs[i]);
                                s.mount(i + 1, "sandbox");
                            }
                            // FIX (KrakenShadow-Mix): Do NOT abort if ShadowMountPlus placed a unionfs!
                            // Stack our ampr-emu-ng fakelib layer directly on top of ShadowMountPlus:
                            None if t.fstype == "unionfs" => {
                                tlog!("{tid} ShadowMountPlus unionfs detected ({}); stacking Kraken fakelib + /app0/kraken on top!", t.from);
                                s.mount(0, "sandbox-stacked-over-smp");
                            }
                            None => {
                                tlog!("{tid} common/lib ready after {waited} ms ({} from {}): {lib}", t.fstype, t.from);
                                s.mount(0, "sandbox");
                            }
                        }
                        break;
                    }
                }
            }
            if waited >= READY_WAIT_MS {
                tlog!("{tid} common/lib not a mount point after {waited} ms (lib={:?}); waiting for exec", s.lib);
                break;
            }
            if !is_dir(&root) {
                tlog!("{tid} sandbox vanished while waiting: {root}");
                return;
            }
            std::thread::sleep(Duration::from_millis(1));
        }
        self.sessions.insert(name.to_string(), s);
    }

    /// Strategy 2 (attach on NOTE_EXEC): also stacks over ShadowMountPlus unionfs if fast_mount missed it.
    fn attach(&mut self, pid: libc::pid_t, tid: &str) {
        let name = match self.sessions.iter().find(|(_, s)| s.pid == Some(pid)) {
            Some((name, _)) => name.clone(),
            None => match resolve_sandbox(tid) {
                Ok(name) => name,
                Err(e) => {
                    tlog!("{tid} exec pid={pid}: no sandbox ({e})");
                    return;
                }
            },
        };
        let s = self.sessions.entry(name.clone()).or_insert_with(|| Session::new(tid));
        if s.lib.is_none() {
            s.lib = find_lib(&name);
        }
        let top = s.top_layer();
        let on_top = top.is_some_and(|i| i + 1 == s.srcs.len());
        if s.cleanup.take().is_some() {
            tlog!("{tid} pending cleanup cancelled by exec");
        }
        match s.lib.clone() {
            None => tlog!("{tid} exec pid={pid}: no <x>/common/lib in {name}"),
            Some(lib) if on_top => s.mount_data(&lib),
            _ if s.srcs.is_empty() => tlog!("{tid} empty fakelib, nothing to overlay; not mounting"),
            Some(_) if top.is_some() => {
                s.mount(top.map_or(0, |i| i + 1), "exec fallback");
            }
            // FIX (KrakenShadow-Mix): Always mount layer 0 + /app0/kraken even if SMP unionfs is underneath!
            Some(_lib) => {
                s.mount(0, "exec fallback (stacked over SMP)");
            }
        }
        if s.pid != Some(pid) {
            s.pid = Some(pid);
            let k = kev(pid as usize, libc::EVFILT_PROC, libc::EV_ADD | libc::EV_ENABLE | libc::EV_CLEAR, libc::NOTE_EXIT as u32);
            if let Err(e) = kevent_add(self.kq, k) {
                tlog!("{tid} exit watch pid={pid} failed: {e}");
            }
        }
    }`,
  },
  {
    id: 'sparse-extents-patch',
    filename: 'patches/01-fix-sparse-extents.patch',
    targetFileInRepo: 'crates/kraken-mount-pkg/src/{kraken.rs,lib.rs} & src/cache.rs',
    language: 'diff',
    title: '2. Патч Sparse Extents (0x40) для .pkg игр (Demon’s Souls, Split Fiction, Ghost of Yōtei, Mafia)',
    problemSolved:
      'В релизе v0.0.1-beta любые .pkg с разреженными блоками (kind 0x40) отбрасываются с ошибкой "the layout has a sparse extent at mount 0x...; repack with --kraken stored". Этот патч заменяет ошибку заполнением нулевых блоков (fill_sparse) и распаковывает затронутые файлы в кэш.',
    content: `--- a/crates/kraken-mount-pkg/src/kraken.rs
+++ b/crates/kraken-mount-pkg/src/kraken.rs
@@ -144,7 +144,7 @@ impl Kraken {
         if naps.size < (rec_at + records * 9) as u64 {
             return Err(corrupt("layout descriptor shorter than its records"));
         }
-        let (bounds, mount) = boundaries(io, naps, fidx_at, files, ublocks)?;
+        let (bounds, sparse, mount) = boundaries(io, naps, fidx_at, files, ublocks)?;
         let next_bound = |x: u64| {
             bounds.get(bounds.partition_point(|&b| b <= x)).copied().unwrap_or(mount)
         };
@@ -170,6 +170,7 @@ impl Kraken {
                 }
                 continue;
             }
+            fill_sparse(&sparse, &mut logical, &mut blocks);
             if strict && i > 0 && nibble != logical & 0xF {
                 return Err(corrupt(format!("record {i}: the exact start's low nibble disagrees")));
             }
@@ -219,6 +220,7 @@ impl Kraken {
             cursor = end;
             logical += len;
         }
+        fill_sparse(&sparse, &mut logical, &mut blocks);
         if logical != mount {
             return Err(corrupt(format!("blocks tile to {logical:#x}, the mount is {mount:#x}")));
         }
@@ -227,18 +229,28 @@ impl Kraken {
     }
 }
 
+fn fill_sparse(sparse: &[(u64, u64)], logical: &mut u64, blocks: &mut Vec<KBlock>) {
+    while let Ok(i) = sparse.binary_search_by_key(logical, |s| s.0) {
+        let end = sparse[i].1;
+        while *logical < end {
+            let len = (end - *logical).min(UBLOCK) as u32;
+            blocks.push(KBlock { logical: *logical, stored_at: 0, len, stored_len: 0, desc: Desc::default() });
+            *logical += u64::from(len);
+        }
+    }
+}
+
 fn boundaries<R: PRead>(
     io: &R,
     naps: &OuterFile,
     fidx_at: usize,
     files: usize,
     ublocks: u64,
-) -> Result<(Vec<u64>, u64), Error> {
+) -> Result<(Vec<u64>, Vec<(u64, u64)>, u64), Error> {
     let mut bounds = Vec::with_capacity(files);
-    let mut sparse_at: Option<u64> = None;
+    let mut sparse_starts = Vec::new();
     let mut buf = vec![0u8; CHUNK * 6];
     let mut done = 0usize;
     while done < files {
@@ -248,7 +260,7 @@ fn boundaries<R: PRead>(
         for r in chunk.chunks_exact(6) {
             let off = u64::from_le_bytes([r[0], r[1], r[2], r[3], r[4], 0, 0, 0]);
             if r[5] == 0x40 {
-                sparse_at = Some(sparse_at.map_or(off, |a: u64| a.min(off)));
+                sparse_starts.push(off);
             }
             bounds.push(off);
         }
@@ -258,12 +270,14 @@ fn boundaries<R: PRead>(
     if mount.div_ceil(UBLOCK) != ublocks || bounds.iter().any(|&b| b > mount) {
         return Err(corrupt("the boundary table disagrees with the mount's size"));
     }
-    if let Some(at) = sparse_at.filter(|&a| a < mount) {
-        return Err(unsupported(format!("the layout has a sparse extent at mount {at:#x}; {REPACK}")));
-    }
     bounds.sort_unstable();
     bounds.dedup();
     bounds.shrink_to_fit();
-    Ok((bounds, mount))
+    sparse_starts.sort_unstable();
+    sparse_starts.dedup();
+    let sparse = sparse_starts.into_iter().filter(|&at| at < mount)
+        .map(|at| (at, bounds[bounds.partition_point(|&b| b <= at)]))
+        .collect();
+    Ok((bounds, sparse, mount))
 }
--- a/crates/kraken-mount-pkg/src/lib.rs
+++ b/crates/kraken-mount-pkg/src/lib.rs
@@ -309,6 +309,11 @@ impl Pkg {
         }
     }
 
+    pub fn has_sparse(&self, e: &Entry) -> bool {
+        self.file(e).is_some_and(|n| !n.ext_ok && n.size != 0
+            && self.image.kraken.range(n.logical, n.size).iter().any(|b| b.stored_len == 0))
+    }
+
--- a/src/cache.rs
+++ b/src/cache.rs
@@ -566,7 +566,7 @@ fn build_inner(src: &Source, s: &Settings, before: &HashSet<PathBuf>) -> Result<
             if LIB_DIRS.iter().any(|d| lower.starts_with(d)) {
                 continue;
             }
-            let chunks = if extracted(e.path) {
+            let chunks = if extracted(e.path) || p.has_sparse(&e) {
                 extract(p, io, &e, &dir.join(e.path), &mut buf)?;
                 None
             } else {`,
  },
  {
    id: 'recursive-scan-and-storage',
    filename: 'src/storage_and_scan_patch.rs',
    targetFileInRepo: 'src/storage.rs & src/scan.rs',
    language: 'rust',
    title: '3. Двухуровневый рекурсивный сканер (.pkg в подпапках + /data/games + /mnt/usb0/pkgs)',
    problemSolved:
      'Оригинальный scan.rs ищет файлы строго на 1 уровне и пропускает .pkg, если они лежат в подпапке (например, /mnt/usb0/homebrew/GameName/game.pkg или /data/games/game.pkg). Этот патч добавляет /data/games, /mnt/usbN/pkgs и автоматически заглядывает внутрь подпапок 1-го уровня, если в них нет eboot.bin.',
    content: `// PATCHED src/storage.rs -> default_scan_roots() + src/scan.rs -> collect_candidates()
pub fn default_scan_roots() -> Vec<String> {
    let present = mounted_aliases();
    let ext: Vec<String> = (0..EXT).map(|i| format!("/mnt/ext{i}")).collect();
    let usb: Vec<String> = (0..USB).map(|i| format!("/mnt/usb{i}")).collect();
    let mut all = vec![
        "/data/homebrew".to_string(),
        "/data/etaHEN/games".to_string(),
        "/data/games".to_string(),
        "/data/pkgs".to_string(),
    ];
    for m in &ext {
        all.push(format!("{m}/homebrew"));
        all.push(format!("{m}/etaHEN/games"));
        all.push(format!("{m}/games"));
        all.push(format!("{m}/pkgs"));
    }
    for m in &usb {
        all.push(format!("{m}/homebrew"));
        all.push(format!("{m}/etaHEN/games"));
        all.push(format!("{m}/games"));
        all.push(format!("{m}/pkgs"));
    }
    all.extend(usb);
    all.extend(ext);
    all.retain(|r| r.starts_with("/data/") || present.iter().any(|m| r == m || r.starts_with(&format!("{m}/"))));
    all
}

/// Collects candidate paths up to 2 levels deep: if a directory in a scan root is NOT a game folder
/// (no eboot.bin), walks 1 level inside it to find nested .pkg files or nested game folders!
fn collect_scan_candidates(root: &Path, result: &mut ScanResult) -> Vec<PathBuf> {
    let mut out = Vec::new();
    let Ok(entries) = fs::read_dir(root) else { return out };
    for entry in entries.flatten() {
        let name = entry.file_name();
        if name.to_string_lossy().starts_with('.') || name == "backports" {
            continue;
        }
        let path = entry.path();
        if path.is_dir() && !path.join("eboot.bin").is_file() {
            // Look 1 level deeper for nested .pkg or game folders (e.g. /mnt/usb0/homebrew/MyGame/game.pkg)
            if let Ok(sub_entries) = fs::read_dir(&path) {
                for sub in sub_entries.flatten() {
                    if !sub.file_name().to_string_lossy().starts_with('.') {
                        out.push(sub.path());
                    }
                }
            }
        } else {
            out.push(path);
        }
    }
    out.sort();
    out
}`,
  },
  {
    id: 'shadowmount-http-bridge',
    filename: 'src/shadow_bridge.rs',
    targetFileInRepo: 'src/shadow_bridge.rs (Новый модуль интеграции с ShadowMountPlus :10101)',
    language: 'rust',
    title: '4. Мост к ShadowMountPlus v1.7 (127.0.0.1:10101) для .ffpkg и .ffpfsc',
    problemSolved:
      'Позволяет вообще не переключаться между ShadowMountPlus и Kraken Mount: когда KrakenShadow-Mix видит контейнеры .ffpkg или .ffpfsc, он автоматически вызывает локальный API ShadowMountPlus (POST http://127.0.0.1:10101/api/v1/scan и /api/v1/games/mount), а свои .pkg / zstd / lz4 монтирует через ampr-emu-ng.',
    content: `//! Unified ShadowMountPlus v1.7 Bridge (127.0.0.1:10101/api/v1)
//! Automatically triggers ShadowMountPlus for .ffpkg and .ffpfsc containers
//! while Kraken Mount handles .pkg, zstd, and lz4 folders.

use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::path::Path;
use std::time::Duration;

const SMP_ADDR: &str = "127.0.0.1:10101";

pub fn is_shadowmount_container(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case("ffpkg") || ext.eq_ignore_ascii_case("ffpfsc"))
}

pub fn notify_shadowmount_scan() -> Result<String, String> {
    let addr: SocketAddr = SMP_ADDR.parse().map_err(|e| format!("{e}"))?;
    let mut stream = TcpStream::connect_timeout(&addr, Duration::from_millis(800))
        .map_err(|e| format!("ShadowMountPlus (10101) offline: {e}"))?;
    let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));

    let req = concat!(
        "POST /api/v1/scan HTTP/1.1\\r\\n",
        "Host: 127.0.0.1:10101\\r\\n",
        "Content-Type: application/json\\r\\n",
        "Content-Length: 2\\r\\n",
        "Connection: close\\r\\n\\r\\n",
        "{}"
    );
    stream.write_all(req.as_bytes()).map_err(|e| format!("write 10101: {e}"))?;
    let mut resp = String::new();
    let _ = stream.read_to_string(&mut resp);
    Ok(resp)
}`,
  },
  {
    id: 'build-and-deploy-mix-script',
    filename: 'ps5/apply-and-build-mix.sh',
    targetFileInRepo: 'ps5/apply-and-build-mix.sh (Автосборка единого kraken-shadow-mix.elf)',
    language: 'shell',
    title: '5. Скрипт автосборки и отправки единого пэйлоада (apply-and-build-mix.elf)',
    problemSolved:
      'Клонирует свежий quer3q/kraken-mount (уже со встроенным фиксом сейвов ampr-emu-ng #62 из коммита 333d7b6), накладывает патч Sparse Extents (#12), патч Stacked UnionFS для совместной работы с ShadowMountPlus и двухуровневый сканер, собирает kraken-mount.elf через Docker и отправляет его на консоль.',
    content: `#!/usr/bin/env bash
set -euo pipefail

PS5_HOST="\${PS5_HOST:-192.168.1.50}"
ELFLDR_PORT="\${ELFLDR_PORT:-9021}"

echo "[1/5] Клонирование quer3q/kraken-mount (включая фикс сохранений ampr-emu-ng commit 333d7b6)..."
if [ ! -d "kraken-mount" ]; then
  git clone https://github.com/quer3q/kraken-mount.git
fi
cd kraken-mount
git fetch origin main
git checkout main

echo "[2/5] Применение патча PR #12 (поддержка Sparse Extents 0x40 в .pkg)..."
curl -sL https://api.github.com/repos/quer3q/kraken-mount/pulls/12.diff | git apply -v || true

echo "[3/5] Патчинг src/launch.rs: включение Stacked UnionFS поверх ShadowMountPlus..."
python3 - << 'EOF'
from pathlib import Path
p = Path("src/launch.rs")
src = p.read_text()
old = '''                            None if t.fstype == "unionfs" => {
                                tlog!("{tid} common/lib occupied by unionfs from {}; not mounting", t.from)
                            }'''
new = '''                            None if t.fstype == "unionfs" => {
                                tlog!("{tid} SMP unionfs detected ({}); stacking Kraken fakelib on top!", t.from);
                                s.mount(0, "sandbox-stacked-over-smp");
                            }'''
if old in src:
    src = src.replace(old, new)
old_exec = '''            Some(lib) => match top_mount(&lib) {
                Ok(t) if t.on == lib && t.fstype == "unionfs" => {
                    tlog!("{tid} common/lib occupied by unionfs from {}; not mounting", t.from)
                }
                _ => {
                    s.mount(0, "exec fallback");
                }
            },'''
new_exec = '''            Some(_lib) => {
                s.mount(0, "exec fallback (stacked over SMP)");
            },'''
if old_exec in src:
    src = src.replace(old_exec, new_exec)
p.write_text(src)
print("Successfully patched src/launch.rs for ShadowMountPlus coexistence!")
EOF

echo "[4/5] Сборка единого бинарника через ps5/build.sh (Docker)..."
./ps5/build.sh
cp target/ps5/kraken-mount.elf target/ps5/kraken-shadow-mix.elf

echo "[5/5] Отправка kraken-shadow-mix.elf в elfldr (\${PS5_HOST}:\${ELFLDR_PORT})..."
nc -w 3 "\${PS5_HOST}" "\${ELFLDR_PORT}" < target/ps5/kraken-shadow-mix.elf
echo "Готово! Веб-панель доступна на http://\${PS5_HOST}:8097/ (работает одновременно с ShadowMountPlus :10101)"
`,
  },
];
