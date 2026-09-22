{
  lib,
  rustPlatform,
  installShellFiles,
}:
rustPlatform.buildRustPackage {
  pname = "flat-flake";
  version = "0.1.0";
  src = lib.cleanSource ./.;
  cargoLock.lockFile = ./Cargo.lock;
  nativeBuildInputs = [ installShellFiles ];

  postInstall = ''
    installShellCompletion --cmd flat-flake \
      --bash <($out/bin/flat-flake completion bash) \
      --fish <($out/bin/flat-flake completion fish) \
      --zsh  <($out/bin/flat-flake completion zsh)
  '';
}
