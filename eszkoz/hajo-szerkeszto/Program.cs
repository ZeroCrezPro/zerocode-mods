using System.Diagnostics;
using System.Drawing.Drawing2D;
using System.Text;
using System.Text.RegularExpressions;

namespace ZeroCode.HajoSzerkeszto;

/// <summary>
/// ZeroCode Hajó Szerkesztő - a Csillagraj játék pixelrajzainak (űrhajó,
/// ellenségek, főellenség) egyszerű rácsos szerkesztője.
///
/// Bal oldalt a rajzok listája, középen a rács, jobb oldalt a színek és a
/// három ecsetméret. A Frissítés gomb visszaírja a rajzokat a játék forrásába
/// (src/jatek/galaga.ts + a fejléc űrhajója a Header.tsx-ben), majd a
/// szerkesztő kiszolgálójával kiteszi az oldalt az éles címre.
/// </summary>
internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new Ablak());
    }
}

/// <summary>Egy rajz: a neve a listában, a változó neve a forrásban, a sorai.</summary>
internal sealed class Rajz
{
    public required string Cim { get; init; }
    public required string Valtozo { get; init; }
    public required List<char[]> Sorok { get; init; }
    public int Szeles => Sorok[0].Length;
    public int Magas => Sorok.Count;
}

internal sealed class Ablak : Form
{
    private static readonly (string Cim, string Valtozo)[] RAJZOK =
    {
        ("Űrhajó", "HAJO"),
        ("Drón", "DRON"),
        ("Vadász", "VADASZ"),
        ("Vezér", "VEZER"),
        ("Villám", "VILLAM"),
        ("Főellenség", "FOELLENSEG"),
    };

    private static readonly Color HATTER = ColorTranslator.FromHtml("#0b0c10");
    private static readonly Color PANEL = ColorTranslator.FromHtml("#14151c");
    private static readonly Color KERET = ColorTranslator.FromHtml("#2a2b36");
    private static readonly Color SZOVEG = ColorTranslator.FromHtml("#eef0f5");
    private static readonly Color HALVANY = ColorTranslator.FromHtml("#8b8fa3");
    private static readonly Color PIROS = ColorTranslator.FromHtml("#d61f27");

    private readonly string _projekt;
    private readonly string _galagaFajl;
    private readonly string _headerFajl;
    private readonly Dictionary<char, Color> _paletta = new();
    private readonly List<Rajz> _rajzok = new();
    private Rajz? _aktiv;
    private char _szin = 'W';
    private int _ecset = 1; // az ecset oldalhossza pixelben: 1, 2 vagy 4
    private readonly Stack<(Rajz, List<char[]>)> _elozmeny = new();
    private bool _mentetlen;

    private readonly ListBox _lista = new();
    private readonly Racs _racs;
    private readonly FlowLayoutPanel _szinek = new();
    private readonly Button[] _ecsetGombok = new Button[3];
    private readonly Button _frissites = new();
    private readonly TextBox _naplo = new();

    public Ablak()
    {
        _projekt = ProjektMappaKeres();
        _galagaFajl = Path.Combine(_projekt, "src", "jatek", "galaga.ts");
        _headerFajl = Path.Combine(_projekt, "src", "components", "Header.tsx");

        Text = "ZeroCode Hajó Szerkesztő";
        BackColor = HATTER;
        ForeColor = SZOVEG;
        Font = new Font("Segoe UI", 10f);
        MinimumSize = new Size(960, 640);
        Size = new Size(1120, 720);
        StartPosition = FormStartPosition.CenterScreen;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

        _racs = new Racs(this) { Dock = DockStyle.Fill, BackColor = HATTER };

        // --- bal: lista ---
        var bal = new Panel { Dock = DockStyle.Left, Width = 210, BackColor = PANEL, Padding = new Padding(12) };
        bal.Controls.Add(_lista);
        bal.Controls.Add(Cimke("RAJZOK"));
        _lista.Dock = DockStyle.Fill;
        _lista.BackColor = PANEL;
        _lista.ForeColor = SZOVEG;
        _lista.BorderStyle = BorderStyle.None;
        _lista.Font = new Font("Segoe UI", 12f);
        _lista.ItemHeight = 36;
        _lista.DrawMode = DrawMode.OwnerDrawFixed;
        _lista.DrawItem += ListaRajzol;
        _lista.SelectedIndexChanged += (_, _) => RajzValaszt();

        // --- jobb: színek + ecsetek ---
        var jobb = new Panel { Dock = DockStyle.Right, Width = 230, BackColor = PANEL, Padding = new Padding(12) };
        var jobbTartalom = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false };
        jobbTartalom.Controls.Add(Cimke("SZÍNEK"));
        _szinek.AutoSize = true;
        _szinek.Width = 200;
        _szinek.Margin = new Padding(0, 0, 0, 16);
        jobbTartalom.Controls.Add(_szinek);
        jobbTartalom.Controls.Add(Cimke("ECSET"));
        var meretek = new[] { (1, "1 pixel"), (2, "4 pixel"), (4, "16 pixel") };
        for (var i = 0; i < meretek.Length; i++)
        {
            var (oldal, cim) = meretek[i];
            var g = Gomb(cim, 200, 40);
            g.Click += (_, _) => { _ecset = oldal; EcsetGombokFrissit(); };
            _ecsetGombok[i] = g;
            jobbTartalom.Controls.Add(g);
        }
        var vissza = Gomb("Visszavonás", 200, 36);
        vissza.Margin = new Padding(0, 16, 0, 0);
        vissza.Click += (_, _) => Visszavon();
        jobbTartalom.Controls.Add(vissza);
        var tipp = new Label
        {
            Text = "Bal gomb: festés\nJobb gomb: törlés\nCtrl+Z: visszavonás",
            ForeColor = HALVANY,
            AutoSize = true,
            Margin = new Padding(0, 16, 0, 0),
        };
        jobbTartalom.Controls.Add(tipp);
        jobb.Controls.Add(jobbTartalom);

        // --- alul: Frissítés + napló ---
        var also = new Panel { Dock = DockStyle.Bottom, Height = 150, BackColor = PANEL, Padding = new Padding(12) };
        _frissites.Text = "FRISSÍTÉS";
        _frissites.Dock = DockStyle.Top;
        _frissites.Height = 44;
        _frissites.FlatStyle = FlatStyle.Flat;
        _frissites.FlatAppearance.BorderSize = 0;
        _frissites.BackColor = PIROS;
        _frissites.ForeColor = Color.White;
        _frissites.Font = new Font("Segoe UI", 12f, FontStyle.Bold);
        _frissites.Cursor = Cursors.Hand;
        _frissites.Click += async (_, _) => await FrissitesAsync();
        _naplo.Dock = DockStyle.Fill;
        _naplo.Multiline = true;
        _naplo.ReadOnly = true;
        _naplo.ScrollBars = ScrollBars.Vertical;
        _naplo.BackColor = HATTER;
        _naplo.ForeColor = HALVANY;
        _naplo.BorderStyle = BorderStyle.None;
        _naplo.Font = new Font("Consolas", 9.5f);
        var naploKeret = new Panel { Dock = DockStyle.Fill, Padding = new Padding(0, 10, 0, 0) };
        naploKeret.Controls.Add(_naplo);
        also.Controls.Add(naploKeret);
        also.Controls.Add(_frissites);

        Controls.Add(_racs);
        Controls.Add(bal);
        Controls.Add(jobb);
        Controls.Add(also);

        KeyPreview = true;
        KeyDown += (_, e) => { if (e.Control && e.KeyCode == Keys.Z) { Visszavon(); e.Handled = true; } };
        FormClosing += (_, e) =>
        {
            if (!_mentetlen) return;
            var v = MessageBox.Show(this, "Vannak nem frissített módosítások. Biztosan kilépsz?", Text,
                MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            if (v != DialogResult.Yes) e.Cancel = true;
        };

        Load += (_, _) => Betolt();
    }

    /* ---------------------------------------------------------------- */
    /* Betöltés a forrásból                                              */
    /* ---------------------------------------------------------------- */

    private void Betolt()
    {
        if (!File.Exists(_galagaFajl))
        {
            Naplo("Nem találom a játék forrását: " + _galagaFajl);
            Naplo("Tedd a programot a weboldal mappájába (ahol a package.json van).");
            _frissites.Enabled = false;
            return;
        }
        var forras = File.ReadAllText(_galagaFajl, Encoding.UTF8);

        // Paletta: a PALETTA blokk betű → szín párjai
        var palettaBlokk = Regex.Match(forras, @"const PALETTA[^{]*\{([^}]*)\}");
        foreach (Match m in Regex.Matches(palettaBlokk.Groups[1].Value, @"(\w):\s*'(#[0-9a-fA-F]{6})'"))
            _paletta[m.Groups[1].Value[0]] = ColorTranslator.FromHtml(m.Groups[2].Value);

        foreach (var (cim, valtozo) in RAJZOK)
        {
            var sorok = SorokOlvas(forras, valtozo);
            if (sorok is null) { Naplo($"Hiányzik a forrásból: {valtozo}"); continue; }
            _rajzok.Add(new Rajz { Cim = cim, Valtozo = valtozo, Sorok = sorok });
        }

        _lista.Items.Clear();
        foreach (var r in _rajzok) _lista.Items.Add(r.Cim);
        SzinGombokEpit();
        EcsetGombokFrissit();
        if (_rajzok.Count > 0) _lista.SelectedIndex = 0;
        Naplo($"Betöltve: {_rajzok.Count} rajz. Projekt: {_projekt}");
    }

    private static List<char[]>? SorokOlvas(string forras, string valtozo)
    {
        var m = Regex.Match(forras, @"const " + valtozo + @" = \[\r?\n((?:[ \t]*'[^']*',[ \t]*\r?\n)+)\]");
        if (!m.Success) return null;
        var sorok = new List<char[]>();
        foreach (Match s in Regex.Matches(m.Groups[1].Value, @"'([^']*)'")) sorok.Add(s.Groups[1].Value.ToCharArray());
        return sorok;
    }

    private static string SorokIr(string forras, string valtozo, List<char[]> sorok)
    {
        var ujsor = forras.Contains("\r\n") ? "\r\n" : "\n";
        var sb = new StringBuilder();
        foreach (var s in sorok) sb.Append("  '").Append(s).Append("',").Append(ujsor);
        return Regex.Replace(
            forras,
            @"(const " + valtozo + @" = \[\r?\n)((?:[ \t]*'[^']*',[ \t]*\r?\n)+)(\])",
            m => m.Groups[1].Value + sb + m.Groups[3].Value,
            RegexOptions.None,
            TimeSpan.FromSeconds(5));
    }

    /* ---------------------------------------------------------------- */
    /* Felület                                                           */
    /* ---------------------------------------------------------------- */

    private static Label Cimke(string szoveg) => new()
    {
        Text = szoveg,
        Dock = DockStyle.Top,
        Height = 28,
        ForeColor = HALVANY,
        Font = new Font("Segoe UI", 9f, FontStyle.Bold),
        Margin = new Padding(0, 0, 0, 6),
    };

    private static Button Gomb(string szoveg, int w, int h)
    {
        var g = new Button
        {
            Text = szoveg,
            Width = w,
            Height = h,
            FlatStyle = FlatStyle.Flat,
            BackColor = HATTER,
            ForeColor = SZOVEG,
            Cursor = Cursors.Hand,
            Margin = new Padding(0, 0, 0, 6),
        };
        g.FlatAppearance.BorderColor = KERET;
        g.FlatAppearance.BorderSize = 1;
        return g;
    }

    private void SzinGombokEpit()
    {
        _szinek.Controls.Clear();
        var szinek = _paletta.Keys.ToList();
        szinek.Add('.'); // törlés (üres pixel)
        foreach (var betu in szinek)
        {
            var g = new Button
            {
                Width = 40,
                Height = 40,
                FlatStyle = FlatStyle.Flat,
                BackColor = betu == '.' ? HATTER : _paletta[betu],
                Text = betu == '.' ? "✕" : "",
                ForeColor = HALVANY,
                Cursor = Cursors.Hand,
                Margin = new Padding(0, 0, 8, 8),
                Tag = betu,
            };
            g.FlatAppearance.BorderSize = 2;
            g.Click += (_, _) => { _szin = betu; SzinGombokFrissit(); };
            _szinek.Controls.Add(g);
        }
        SzinGombokFrissit();
    }

    private void SzinGombokFrissit()
    {
        foreach (Button g in _szinek.Controls)
            g.FlatAppearance.BorderColor = (char)g.Tag! == _szin ? Color.White : KERET;
    }

    private void EcsetGombokFrissit()
    {
        var oldalak = new[] { 1, 2, 4 };
        for (var i = 0; i < _ecsetGombok.Length; i++)
        {
            var aktiv = oldalak[i] == _ecset;
            _ecsetGombok[i].BackColor = aktiv ? PIROS : HATTER;
            _ecsetGombok[i].FlatAppearance.BorderColor = aktiv ? PIROS : KERET;
        }
    }

    private void ListaRajzol(object? _, DrawItemEventArgs e)
    {
        if (e.Index < 0) return;
        var kijelolt = (e.State & DrawItemState.Selected) != 0;
        using var hatter = new SolidBrush(kijelolt ? PIROS : PANEL);
        e.Graphics.FillRectangle(hatter, e.Bounds);
        TextRenderer.DrawText(e.Graphics, _lista.Items[e.Index].ToString(), _lista.Font,
            new Rectangle(e.Bounds.X + 10, e.Bounds.Y, e.Bounds.Width - 10, e.Bounds.Height),
            kijelolt ? Color.White : SZOVEG, TextFormatFlags.VerticalCenter | TextFormatFlags.Left);
    }

    private void RajzValaszt()
    {
        _aktiv = _lista.SelectedIndex >= 0 && _lista.SelectedIndex < _rajzok.Count ? _rajzok[_lista.SelectedIndex] : null;
        _racs.Invalidate();
    }

    private void Naplo(string sor)
    {
        if (InvokeRequired) { BeginInvoke(() => Naplo(sor)); return; }
        _naplo.AppendText(sor + Environment.NewLine);
    }

    /* ---------------------------------------------------------------- */
    /* Festés                                                            */
    /* ---------------------------------------------------------------- */

    internal Rajz? Aktiv => _aktiv;
    internal Color Szin(char betu) => _paletta.TryGetValue(betu, out var c) ? c : Color.Magenta;

    internal void EcsetKezd()
    {
        if (_aktiv is null) return;
        _elozmeny.Push((_aktiv, _aktiv.Sorok.Select(s => (char[])s.Clone()).ToList()));
        if (_elozmeny.Count > 200) _elozmeny.TryPop(out _);
    }

    /// <summary>Az ecset a kurzor körül fest: 1×1, 2×2 vagy 4×4 pixel.</summary>
    internal void Fest(int x, int y, bool torles)
    {
        if (_aktiv is null) return;
        var betu = torles ? '.' : _szin;
        var eltolas = _ecset == 1 ? 0 : _ecset / 2 - 1; // 2×2: 0, 4×4: 1
        var valtozott = false;
        for (var dy = 0; dy < _ecset; dy++)
            for (var dx = 0; dx < _ecset; dx++)
            {
                var px = x - eltolas + dx;
                var py = y - eltolas + dy;
                if (px < 0 || py < 0 || px >= _aktiv.Szeles || py >= _aktiv.Magas) continue;
                if (_aktiv.Sorok[py][px] == betu) continue;
                _aktiv.Sorok[py][px] = betu;
                valtozott = true;
            }
        if (valtozott) { _mentetlen = true; _racs.Invalidate(); }
    }

    private void Visszavon()
    {
        if (!_elozmeny.TryPop(out var e)) return;
        var (rajz, sorok) = e;
        for (var i = 0; i < sorok.Count; i++) rajz.Sorok[i] = sorok[i];
        if (rajz != _aktiv) _lista.SelectedIndex = _rajzok.IndexOf(rajz);
        _racs.Invalidate();
    }

    /* ---------------------------------------------------------------- */
    /* Frissítés: forrásba írás + kiszolgáló + publikálás                */
    /* ---------------------------------------------------------------- */

    private async Task FrissitesAsync()
    {
        _frissites.Enabled = false;
        _naplo.Clear();
        try
        {
            ForrasbaIr();
            Naplo("A rajzok a forrásba írva.");
            await PublikalAsync();
            _mentetlen = false;
        }
        catch (Exception e)
        {
            Naplo("HIBA: " + e.Message);
        }
        finally
        {
            _frissites.Enabled = true;
        }
    }

    private void ForrasbaIr()
    {
        var galaga = File.ReadAllText(_galagaFajl, Encoding.UTF8);
        foreach (var r in _rajzok) galaga = SorokIr(galaga, r.Valtozo, r.Sorok);
        File.WriteAllText(_galagaFajl, galaga, new UTF8Encoding(false));

        // A fejléc kockájában ugyanaz az űrhajó villan fel, mint a játékban.
        var hajo = _rajzok.FirstOrDefault(r => r.Valtozo == "HAJO");
        if (hajo is not null && File.Exists(_headerFajl))
        {
            var header = File.ReadAllText(_headerFajl, Encoding.UTF8);
            header = SorokIr(header, "HAJO_SOROK", hajo.Sorok);
            File.WriteAllText(_headerFajl, header, new UTF8Encoding(false));
        }
    }

    private async Task PublikalAsync()
    {
        var szerverFajl = Path.Combine(_projekt, "eszkoz", "szerkeszto", "szerver.mjs");
        if (!File.Exists(szerverFajl)) throw new Exception("Nem találom a szerkesztő kiszolgálóját: " + szerverFajl);

        var indito = new ProcessStartInfo
        {
            FileName = "node",
            Arguments = "\"" + szerverFajl + "\"",
            WorkingDirectory = _projekt,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        indito.Environment["ZC_PORT"] = "0";

        using var p = Process.Start(indito) ?? throw new Exception("A node nem indítható. Telepítve van a Node.js?");
        var cim = new TaskCompletionSource<string>();
        p.OutputDataReceived += (_, e) =>
        {
            if (e.Data is null) return;
            var t = Regex.Match(e.Data, @"ZC_SZERKESZTO_URL=(\S+)");
            if (t.Success) cim.TrySetResult(t.Groups[1].Value);
        };
        p.ErrorDataReceived += (_, e) => { if (!string.IsNullOrWhiteSpace(e.Data)) Naplo(e.Data); };
        p.BeginOutputReadLine();
        p.BeginErrorReadLine();

        try
        {
            Naplo("A kiszolgáló indul…");
            var kesz = await Task.WhenAny(cim.Task, Task.Delay(30000));
            if (kesz != cim.Task) throw new Exception("A kiszolgáló nem indult el 30 másodpercen belül.");
            var url = new Uri(cim.Task.Result);
            var kulcs = url.Query.TrimStart('?').Replace("k=", "");
            var alap = url.GetLeftPart(UriPartial.Authority);

            using var http = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };

            // Előbb a napló folyamára iratkozunk fel, csak utána indítjuk a műveletet.
            using var valasz = await http.GetAsync($"{alap}/api/naplo?k={kulcs}", HttpCompletionOption.ResponseHeadersRead);
            valasz.EnsureSuccessStatusCode();
            using var folyam = new StreamReader(await valasz.Content.ReadAsStreamAsync(), Encoding.UTF8);

            var test = new StringContent("{\"nev\":\"frissites\",\"uzenet\":\"A Csillagraj űrhajóinak kinézete frissítve\"}", Encoding.UTF8, "application/json");
            var inditas = await http.PostAsync($"{alap}/api/muvelet?k={kulcs}", test);
            inditas.EnsureSuccessStatusCode();

            while (true)
            {
                var sor = await folyam.ReadLineAsync();
                if (sor is null) throw new Exception("A kiszolgáló kapcsolata megszakadt.");
                if (!sor.StartsWith("data: ")) continue;
                var esemeny = System.Text.Json.JsonDocument.Parse(sor[6..]).RootElement;
                var tipus = esemeny.GetProperty("tipus").GetString() ?? "";
                var szoveg = esemeny.GetProperty("szoveg").GetString() ?? "";
                if (tipus == "kezdes") continue;
                Naplo(tipus == "lepes" ? "▶ " + szoveg : szoveg);
                if (tipus == "kesz") break;
                if (tipus == "hiba") throw new Exception(szoveg);
            }
        }
        finally
        {
            try { if (!p.HasExited) p.Kill(true); } catch { }
        }
    }

    /// <summary>A projekt gyökere: a program mellett, majd felfelé haladva.</summary>
    private static string ProjektMappaKeres()
    {
        foreach (var kiindulas in new[] { AppContext.BaseDirectory, Directory.GetCurrentDirectory() })
        {
            var dir = new DirectoryInfo(kiindulas);
            for (var i = 0; i < 8 && dir is not null; i++, dir = dir.Parent)
            {
                if (File.Exists(Path.Combine(dir.FullName, "package.json")) &&
                    File.Exists(Path.Combine(dir.FullName, "src", "jatek", "galaga.ts")))
                    return dir.FullName;
            }
        }
        return Directory.GetCurrentDirectory();
    }
}

/// <summary>A középső rács: a rajz pixelei nagyítva, egérrel festhetően.</summary>
internal sealed class Racs : Control
{
    private readonly Ablak _ablak;
    private bool _festes;
    private bool _torles;

    public Racs(Ablak ablak)
    {
        _ablak = ablak;
        DoubleBuffered = true;
        SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
        Cursor = Cursors.Cross;
    }

    private (int cella, int x0, int y0) Elrendezes()
    {
        var r = _ablak.Aktiv;
        if (r is null) return (0, 0, 0);
        var cella = Math.Max(4, Math.Min((Width - 40) / r.Szeles, (Height - 40) / r.Magas));
        return (cella, (Width - cella * r.Szeles) / 2, (Height - cella * r.Magas) / 2);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        e.Graphics.Clear(BackColor);
        var r = _ablak.Aktiv;
        if (r is null)
        {
            TextRenderer.DrawText(e.Graphics, "Válassz egy rajzot a bal oldali listából.", Font, ClientRectangle,
                Color.Gray, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
            return;
        }
        var (cella, x0, y0) = Elrendezes();
        e.Graphics.SmoothingMode = SmoothingMode.None;
        using var racsToll = new Pen(Color.FromArgb(50, 255, 255, 255));
        using var keretToll = new Pen(Color.FromArgb(120, 255, 255, 255));
        using var ures = new SolidBrush(Color.FromArgb(255, 20, 21, 28));
        for (var y = 0; y < r.Magas; y++)
            for (var x = 0; x < r.Szeles; x++)
            {
                var betu = r.Sorok[y][x];
                var teglalap = new Rectangle(x0 + x * cella, y0 + y * cella, cella, cella);
                if (betu == '.') e.Graphics.FillRectangle(ures, teglalap);
                else
                {
                    using var b = new SolidBrush(_ablak.Szin(betu));
                    e.Graphics.FillRectangle(b, teglalap);
                }
                e.Graphics.DrawRectangle(racsToll, teglalap);
            }
        e.Graphics.DrawRectangle(keretToll, x0, y0, cella * r.Szeles, cella * r.Magas);
        TextRenderer.DrawText(e.Graphics, $"{r.Cim}  ·  {r.Szeles} × {r.Magas} pixel", Font,
            new Point(x0, y0 - 26), Color.Gray);
    }

    private bool Pixel(Point p, out int x, out int y)
    {
        var (cella, x0, y0) = Elrendezes();
        x = y = -1;
        if (cella == 0) return false;
        x = (int)Math.Floor((p.X - x0) / (double)cella);
        y = (int)Math.Floor((p.Y - y0) / (double)cella);
        var r = _ablak.Aktiv!;
        return x >= 0 && y >= 0 && x < r.Szeles && y < r.Magas;
    }

    protected override void OnMouseDown(MouseEventArgs e)
    {
        if (_ablak.Aktiv is null) return;
        if (e.Button != MouseButtons.Left && e.Button != MouseButtons.Right) return;
        _festes = true;
        _torles = e.Button == MouseButtons.Right;
        _ablak.EcsetKezd();
        if (Pixel(e.Location, out var x, out var y)) _ablak.Fest(x, y, _torles);
    }

    protected override void OnMouseMove(MouseEventArgs e)
    {
        if (!_festes) return;
        if (Pixel(e.Location, out var x, out var y)) _ablak.Fest(x, y, _torles);
    }

    protected override void OnMouseUp(MouseEventArgs e) => _festes = false;
}
