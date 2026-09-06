# read-proc-env.ps1 — read ANOTHER process's environment block (PEB) and print
# ONLY the KEY NAMES (part before first '='). Values are never printed.
# Usage: read-proc-env.ps1 <pid> [filterRegex]
param([int]$Pid, [string]$Filter = ".*")
$AddTypeSource = @"
using System;
using System.Runtime.InteropServices;
public static class ProcEnv {
  [StructLayout(LayoutKind.Sequential)]
  public struct PROCESS_BASIC_INFORMATION {
    public IntPtr Reserved1; public IntPtr PebBaseAddress; public IntPtr Reserved2_0;
    public IntPtr Reserved2_1; public IntPtr UniqueProcessId; public IntPtr InheritedFromUniqueProcessId;
  }
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern IntPtr OpenProcess(int dwDesiredAccess, bool bInheritHandle, int dwProcessId);
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool ReadProcessMemory(IntPtr hProcess, IntPtr lpBaseAddress, byte[] lpBuffer, IntPtr nSize, out IntPtr lpNumberOfBytesRead);
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool CloseHandle(IntPtr hObject);
  [DllImport("ntdll.dll")]
  public static extern int NtQueryInformationProcess(IntPtr hProcess, int ProcessInformationClass, out PROCESS_BASIC_INFORMATION pbi, int Length, out int ReturnLength);
  public static IntPtr EnvBlock(int pid) {
    IntPtr h = OpenProcess(0x0410, false, pid); // QUERY_INFORMATION | VM_READ
    if (h == IntPtr.Zero) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
    try {
      PROCESS_BASIC_INFORMATION pbi; int rl;
      if (NtQueryInformationProcess(h, 0, out pbi, Marshal.SizeOf(typeof(PROCESS_BASIC_INFORMATION)), out rl) != 0) throw new Exception("NtQueryInformationProcess failed");
      // PEB -> RTL_USER_PROCESS_PARAMETERS at offset 0x20 (x64)
      IntPtr paramsPtr = ReadPtr(h, IntPtr.Add(pbi.PebBaseAddress, 0x20));
      // ProcessParameters -> Environment at offset 0x80 (x64)
      return ReadPtr(h, IntPtr.Add(paramsPtr, 0x80));
    } finally { CloseHandle(h); }
  }
  static IntPtr ReadPtr(IntPtr h, IntPtr addr) {
    byte[] buf = new byte[8]; IntPtr rd;
    if (!ReadProcessMemory(h, addr, buf, (IntPtr)8, out rd)) throw new Exception("ReadProcessMemory ptr @ " + addr);
    return (IntPtr)BitConverter.ToInt64(buf, 0);
  }
}
"@
Add-Type -TypeDefinition $AddTypeSource
$envAddr = [ProcEnv]::EnvBlock($Pid)
$h = [ProcEnv]::OpenProcess(0x0410, $false, $Pid)
try {
  $buf = New-Object byte[] 32768
  $rd = [IntPtr]::Zero
  if ([ProcEnv]::ReadProcessMemory($h, $envAddr, $buf, (New-Object IntPtr $buf.Length), [ref]$rd)) {
    $raw = [System.Text.Encoding]::Unicode.GetString($buf, 0, [int]$rd)
    $nulls = $raw -split "`0`0",2
    $block = $nulls[0]
    foreach ($pair in ($block -split "`0")) {
      if ($pair -eq "") { continue }
      $eq = $pair.IndexOf('=')
      if ($eq -gt 0) {
        $key = $pair.Substring(0, $eq)
        if ($key -match $Filter) { Write-Output $key }
      }
    }
  } else { Write-Error "ReadProcessMemory failed: " + [Runtime.InteropServices.Marshal]::GetLastWin32Error() }
} finally { [ProcEnv]::CloseHandle($h) }