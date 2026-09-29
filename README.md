# ReUse Stoc

Site cu produse refolosibile, găzduit gratuit pe GitHub Pages.

- **Site public:** `https://UTILIZATOR.github.io/NUME-REPO/`
- **Admin (adaugi/editezi/ștergi produse):** `https://UTILIZATOR.github.io/NUME-REPO/admin.html`

## Setări
Numele site-ului se schimbă în `config.js`. Telefonul de WhatsApp se pune la fiecare produs, din admin.

## Pornire GitHub Pages
Repo → Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)` → Save.

## Token pentru admin (o singură dată)
GitHub → poza de profil → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token:
- Repository access: **Only select repositories** → repo-ul site-ului
- Permissions → Repository permissions → **Contents: Read and write**
- Generate, copiezi tokenul și îl lipești în `admin.html`.

Tokenul rămâne salvat doar pe dispozitivul tău. Nu-l pune niciodată în fișierele din repo.

Modificările apar pe site în circa 1 minut după salvare.
