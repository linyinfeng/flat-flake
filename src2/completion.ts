import type { Shell } from "@/options.ts";
import { PROGRAM, SHELLS, VERSION } from "@/options.ts";

/** Generate a shell completion script, replacing `clap_complete`. */
export function generateCompletions(shell: Shell): string {
  switch (shell) {
    case "bash":
      return bash();
    case "fish":
      return fish();
    case "zsh":
      return zsh();
    case "elvish":
      return elvish();
    case "powershell":
      return powershell();
  }
}

const SUBCOMMANDS = "check completion help";
const SHELL_LIST = SHELLS.join(" ");

function bash(): string {
  return `# bash completion for ${PROGRAM} ${VERSION}
_${PROGRAM}() {
    local cur prev
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"

    local completions=""
    if [[ \${COMP_CWORD} -eq 1 ]]; then
        completions="${SUBCOMMANDS} -h --help -V --version"
    else
        case "\${COMP_WORDS[1]}" in
            check)
                case "\${prev}" in
                    -l|--lock-file|-c|--config-file) completions="" ;;
                    *) completions="-l --lock-file -c --config-file -h --help" ;;
                esac
                ;;
            completion)
                if [[ \${COMP_CWORD} -eq 2 ]]; then
                    completions="${SHELL_LIST}"
                else
                    completions="-h --help"
                fi
                ;;
            *)
                completions="-h --help"
                ;;
        esac
    fi

    COMPREPLY=( $(compgen -W "\${completions}" -- "\${cur}") )
}
complete -F _${PROGRAM} -o bashdefault -o default ${PROGRAM}
`;
}

function fish(): string {
  return `# fish completion for ${PROGRAM} ${VERSION}
complete -c ${PROGRAM} -f
complete -c ${PROGRAM} -n "__fish_use_subcommand" -s h -l help -d 'Print help'
complete -c ${PROGRAM} -n "__fish_use_subcommand" -s V -l version -d 'Print version'
complete -c ${PROGRAM} -n "__fish_use_subcommand" -f -a "check" -d 'Check flake'
complete -c ${PROGRAM} -n "__fish_use_subcommand" -f -a "completion" -d 'Generate shell completions'
complete -c ${PROGRAM} -n "__fish_seen_subcommand_from check" -s l -l lock-file -r -d 'Read lock contents from a file'
complete -c ${PROGRAM} -n "__fish_seen_subcommand_from check" -s c -l config-file -r -d 'Read configuration from a file'
complete -c ${PROGRAM} -n "__fish_seen_subcommand_from completion" -f -a "${SHELL_LIST}"
`;
}

function zsh(): string {
  return `#compdef ${PROGRAM}
# zsh completion for ${PROGRAM} ${VERSION}
_${PROGRAM}() {
    local -a commands
    commands=(
        'check:Check flake'
        'completion:Generate shell completions'
        'help:Print help'
    )

    _arguments -C \\
        '(-h --help)'{-h,--help}'[Print help]' \\
        '(-V --version)'{-V,--version}'[Print version]' \\
        '1: :->command' \\
        '*:: :->args'

    case $state in
        command)
            _describe -t commands 'command' commands
            ;;
        args)
            case $words[1] in
                check)
                    _arguments \\
                        '(-l --lock-file)'{-l,--lock-file}'[Read lock contents from a file]:file:_files' \\
                        '(-c --config-file)'{-c,--config-file}'[Read configuration from a file]:file:_files' \\
                        '1:flake:_files -/'
                    ;;
                completion)
                    _values 'shell' ${SHELL_LIST}
                    ;;
            esac
            ;;
    esac
}

if [ "$funcstack[1]" = "_${PROGRAM}" ]; then
    _${PROGRAM} "$@"
else
    compdef _${PROGRAM} ${PROGRAM}
fi
`;
}

function elvish(): string {
  return `# elvish completion for ${PROGRAM} ${VERSION}
use builtin
use str

set edit:completion:arg-completer[${PROGRAM}] = {|@words|
    fn cand {|text desc| edit:complex-candidate $text &display=$text' '$desc }
    var command = '${PROGRAM}'
    if (>= (count $words) 2) {
        set command = $words[1]
    }
    if (eq $command '${PROGRAM}') {
        cand check 'Check flake'
        cand completion 'Generate shell completions'
        cand help 'Print help'
    } elif (eq $command 'check') {
        cand -l 'Read lock contents from a file'
        cand --lock-file 'Read lock contents from a file'
        cand -c 'Read configuration from a file'
        cand --config-file 'Read configuration from a file'
    } elif (eq $command 'completion') {
        ${SHELLS.map((s) => `cand ${s} ''`).join("\n        ")}
    }
}
`;
}

function powershell(): string {
  return `# powershell completion for ${PROGRAM} ${VERSION}
using namespace System.Management.Automation
using namespace System.Management.Automation.Language

Register-ArgumentCompleter -Native -CommandName '${PROGRAM}' -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $completions = @(
        [CompletionResult]::new('check', 'check', [CompletionResultType]::ParameterValue, 'Check flake')
        [CompletionResult]::new('completion', 'completion', [CompletionResultType]::ParameterValue, 'Generate shell completions')
        [CompletionResult]::new('help', 'help', [CompletionResultType]::ParameterValue, 'Print help')
        [CompletionResult]::new('-h', '-h', [CompletionResultType]::ParameterName, 'Print help')
        [CompletionResult]::new('--help', '--help', [CompletionResultType]::ParameterName, 'Print help')
        [CompletionResult]::new('-V', '-V', [CompletionResultType]::ParameterName, 'Print version')
        [CompletionResult]::new('--version', '--version', [CompletionResultType]::ParameterName, 'Print version')
    )

    $completions | Where-Object { $_.CompletionText -like "$wordToComplete*" } |
        Sort-Object -Property ListItemText
}
`;
}
