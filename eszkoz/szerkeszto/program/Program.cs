using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace ZeroCode.Szerkeszto;

/// <summary>
/// ZeroCode Szerkesztő - asztali indító.
///
/// A program elindítja a helyi Node kiszolgálót (eszkoz/szerkeszto/szerver.mjs),
/// megvárja, amíg az kiírja a saját címét, majd megjeleníti egy beépített
/// böngészőablakban. Bezáráskor a kiszolgálót is leállítja.
/// </summary>
internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new FoAblak());
    }
}

internal sealed class FoAblak : Form
{
    private readonly WebView2 _nezet = new();
    private readonly Label _allapot = new();
    private Process? _szerver;
    private string? _cim;
    private readonly StringBuilder _naplo = new();

    /// <summary>A weboldal projektmappája (ahol a package.json van).</summary>
    private readonly string _projekt;

    public FoAblak()
    {
        _projekt = ProjektMappaKeres();

        Text = "ZeroCode Szerkesztő";
        MinimumSize = new Size(1024, 640);
        Size = new Size(1440, 900);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(8, 8, 10);
        Icon = IkonBetoltes();

        _allapot.Dock = DockStyle.Fill;
        _allapot.TextAlign = ContentAlignment.MiddleCenter;
        _allapot.ForeColor = Color.FromArgb(168, 168, 179);
        _allapot.BackColor = Color.FromArgb(8, 8, 10);
        _allapot.Font = new Font("Segoe UI", 10F);
        _allapot.Text = "ZeroCode Szerkesztő indul…";
        Controls.Add(_allapot);

        _nezet.Dock = DockStyle.Fill;
        _nezet.DefaultBackgroundColor = Color.FromArgb(8, 8, 10);
        _nezet.Visible = false;
        Controls.Add(_nezet);

        Load += async (_, _) => await IndulasAsync();
        FormClosing += (_, e) => Leallitas(e);
    }

    /// <summary>
    /// A programikon betöltése.
    ///
    /// Egyfájlos kiadásnál nincs ikon.ico a program mellett, ezért magából az
    /// EXE-be fordított ikont olvassuk ki - így a címsorban, a tálcán és az
    /// Alt+Tab listában is a ZeroCode jel látszik.
    /// </summary>
    private static Icon? IkonBetoltes()
    {
        try
        {
            var sajatUt = Environment.ProcessPath;
            if (sajatUt is not null && File.Exists(sajatUt))
            {
                var beagyazott = Icon.ExtractAssociatedIcon(sajatUt);
                if (beagyazott is not null) return beagyazott;
            }
        }
        catch { /* megyünk tovább a tartalék útvonalra */ }

        try
        {
            // Fejlesztés közben (nem egyfájlos build) a fájl ott van a program mellett.
            var mellette = Path.Combine(AppContext.BaseDirectory, "ikon.ico");
            if (File.Exists(mellette)) return new Icon(mellette);
        }
        catch { /* ikon nélkül is elindul */ }

        return null;
    }

    /// <summary>
    /// Megkeresi a projekt gyökerét: a program mellett, majd felfelé haladva
    /// az első olyan mappát, amelyben van package.json és eszkoz/szerkeszto.
    /// </summary>
    private static string ProjektMappaKeres()
    {
        var jelolt = new List<string> { AppContext.BaseDirectory, Directory.GetCurrentDirectory() };
        foreach (var kiindulas in jelolt)
        {
            var dir = new DirectoryInfo(kiindulas);
            for (var i = 0; i < 8 && dir is not null; i++, dir = dir.Parent)
            {
                if (File.Exists(Path.Combine(dir.FullName, "package.json")) &&
                    File.Exists(Path.Combine(dir.FullName, "eszkoz", "szerkeszto", "szerver.mjs")))
                {
                    return dir.FullName;
                }
            }
        }
        return Directory.GetCurrentDirectory();
    }

    private async Task IndulasAsync()
    {
        var szerverFajl = Path.Combine(_projekt, "eszkoz", "szerkeszto", "szerver.mjs");
        if (!File.Exists(szerverFajl))
        {
            Hiba(
                "Nem találom a weboldal projektmappáját.\n\n" +
                "Tedd ezt a programot a weboldal mappájába (oda, ahol a package.json van), " +
                "vagy annak egy almappájába.");
            return;
        }

        if (!NodeElerheto(out var nodeHiba))
        {
            Hiba(
                "A Node.js nem érhető el ezen a gépen.\n\n" + nodeHiba +
                "\n\nTelepítsd a https://nodejs.org oldalról (LTS verzió), majd indítsd újra a programot.");
            return;
        }

        _allapot.Text = "Helyi kiszolgáló indítása…";

        try
        {
            _szerver = SzerverIndit(szerverFajl);
        }
        catch (Exception e)
        {
            Hiba("Nem sikerült elindítani a helyi kiszolgálót.\n\n" + e.Message);
            return;
        }

        // Megvárjuk, amíg a kiszolgáló kiírja a címét (legfeljebb 30 másodperc).
        for (var i = 0; i < 300 && _cim is null; i++)
        {
            if (_szerver.HasExited)
            {
                Hiba("A helyi kiszolgáló váratlanul leállt.\n\n" + _naplo);
                return;
            }
            await Task.Delay(100);
        }

        if (_cim is null)
        {
            Hiba("A helyi kiszolgáló nem válaszolt időben.\n\n" + _naplo);
            return;
        }

        try
        {
            var adatMappa = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "ZeroCodeSzerkeszto");
            var kornyezet = await CoreWebView2Environment.CreateAsync(null, adatMappa);
            await _nezet.EnsureCoreWebView2Async(kornyezet);
        }
        catch (Exception e)
        {
            Hiba(
                "A beépített böngészőablak (WebView2) nem indult el.\n\n" + e.Message +
                "\n\nTelepítsd a WebView2 futtatókörnyezetet, vagy nyisd meg a szerkesztőt böngészőben:\n" + _cim);
            return;
        }

        var beallitas = _nezet.CoreWebView2.Settings;
        beallitas.AreDefaultContextMenusEnabled = false;
        beallitas.IsStatusBarEnabled = false;
        beallitas.AreBrowserAcceleratorKeysEnabled = false;

        // A külső linkek az alapértelmezett böngészőben nyíljanak meg.
        _nezet.CoreWebView2.NewWindowRequested += (_, e) =>
        {
            e.Handled = true;
            BongeszobenMegnyit(e.Uri);
        };

        _nezet.CoreWebView2.DocumentTitleChanged += (_, _) =>
        {
            var c = _nezet.CoreWebView2.DocumentTitle;
            Text = string.IsNullOrWhiteSpace(c) ? "ZeroCode Szerkesztő" : c;
        };

        _nezet.CoreWebView2.Navigate(_cim);
        _nezet.Visible = true;
        _allapot.Visible = false;
    }

    private Process SzerverIndit(string szerverFajl)
    {
        var indito = new ProcessStartInfo
        {
            FileName = "node",
            WorkingDirectory = _projekt,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        indito.ArgumentList.Add(szerverFajl);

        var p = new Process { StartInfo = indito, EnableRaisingEvents = true };

        p.OutputDataReceived += (_, e) => SorFeldolgoz(e.Data);
        p.ErrorDataReceived += (_, e) => SorFeldolgoz(e.Data);

        p.Start();
        p.BeginOutputReadLine();
        p.BeginErrorReadLine();
        return p;
    }

    private void SorFeldolgoz(string? sor)
    {
        if (sor is null) return;
        lock (_naplo)
        {
            if (_naplo.Length < 4000) _naplo.AppendLine(sor);
        }
        var talalat = Regex.Match(sor, @"ZC_SZERKESZTO_URL=(\S+)");
        if (talalat.Success) _cim = talalat.Groups[1].Value;
    }

    private static bool NodeElerheto(out string uzenet)
    {
        try
        {
            var p = Process.Start(new ProcessStartInfo
            {
                FileName = "node",
                Arguments = "--version",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
            });
            if (p is null) { uzenet = "A node parancs nem indítható."; return false; }
            var verzio = p.StandardOutput.ReadToEnd().Trim();
            p.WaitForExit(8000);
            uzenet = verzio;
            return p.ExitCode == 0;
        }
        catch (Exception e)
        {
            uzenet = e.Message;
            return false;
        }
    }

    private static void BongeszobenMegnyit(string cim)
    {
        try
        {
            Process.Start(new ProcessStartInfo { FileName = cim, UseShellExecute = true });
        }
        catch { /* ha nincs böngésző, nem történik semmi */ }
    }

    private void Hiba(string uzenet)
    {
        _nezet.Visible = false;
        _allapot.Visible = true;
        _allapot.ForeColor = Color.FromArgb(244, 103, 109);
        _allapot.Text = uzenet;
    }

    private void Leallitas(FormClosingEventArgs e)
    {
        try
        {
            if (_szerver is { HasExited: false })
            {
                _szerver.Kill(entireProcessTree: true);
                _szerver.WaitForExit(3000);
            }
        }
        catch { /* leállításkor a hibák már nem érdekesek */ }
    }
}
