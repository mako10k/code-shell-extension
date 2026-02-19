import * as vscode from 'vscode';
import {
  createShellToolRuntime,
  dispatchToolCall,
  TOOL_NAMES,
  type ToolName,
  type ToolParams,
  type ShellToolRuntime,
  type CreateMessageCallback,
  type ElicitationHandler
} from '@mako10k/shell-server/tool-runtime';

const SERVER_LABEL = 'Safe Shell Runner';
const ENABLED_TOOL_NAMES = TOOL_NAMES.filter((toolName) => !toolName.startsWith('server_'));
const FALLBACK_WORKSPACE_KEY = '__fallback__';

function getConfiguredWorkspaceFolder(output: vscode.OutputChannel): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 0) {
    return undefined;
  }

  const config = vscode.workspace.getConfiguration('safeShellRunner');
  const configuredWorkspace = config.get<string>('workspaceFolder', '').trim();
  if (configuredWorkspace) {
    const matchedFolder = folders.find((folder) =>
      folder.name === configuredWorkspace || folder.uri.fsPath === configuredWorkspace
    );

    if (matchedFolder) {
      return matchedFolder;
    }

    output.appendLine(`Configured safeShellRunner.workspaceFolder not found: ${configuredWorkspace}`);
  }

  if (folders.length === 1) {
    return folders[0];
  }

  return undefined;
}

function resolveConfiguredWorkingDirectory(folder: vscode.WorkspaceFolder): string {
  const config = vscode.workspace.getConfiguration('safeShellRunner', folder.uri);
  const template = config.get<string>('defaultWorkingDirectory', '${workspaceFolder}');

  return template
    .replaceAll('${workspaceFolder}', folder.uri.fsPath)
    .replaceAll('${workspaceFolderBasename}', folder.name);
}

function getAllowedWorkingDirectories(preferred?: string): string[] {
  const workspaceDirectories = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath) ?? [];

  return Array.from(new Set([
    ...workspaceDirectories,
    preferred,
    process.cwd(),
  ].filter((directory): directory is string => Boolean(directory))));
}

function configureShellServerEnvironment(preferred?: string) {
  const allowedDirectories = getAllowedWorkingDirectories(preferred);
  process.env['SHELL_SERVER_ALLOWED_WORKDIRS'] = allowedDirectories.join(',');

  if (preferred) {
    process.env['SHELL_SERVER_DEFAULT_WORKDIR'] = preferred;
  }
}

const runtimePromises = new Map<string, Promise<ShellToolRuntime>>();

function createVSCodeMessageCallback(): CreateMessageCallback {
  return async (request: Parameters<CreateMessageCallback>[0]) => {
    const models = await vscode.lm.selectChatModels({});
    const model = models[0];
    if (!model) {
      throw new Error('No VS Code language model is available for enhanced evaluation.');
    }

    const messages: vscode.LanguageModelChatMessage[] = [];
    if (request.systemPrompt) {
      messages.push(
        vscode.LanguageModelChatMessage.User(`[system]\n${request.systemPrompt}`)
      );
    }

    for (const message of request.messages) {
      if (message.role === 'tool') {
        continue;
      }
      if (message.role === 'user') {
        messages.push(vscode.LanguageModelChatMessage.User(message.content.text));
        continue;
      }
      messages.push(vscode.LanguageModelChatMessage.Assistant(message.content.text));
    }

    const response = await model.sendRequest(messages, {
      justification: 'Run Safe Shell Runner enhanced safety evaluation via VS Code language model.'
    });

    let text = '';
    for await (const part of response.text) {
      text += part;
    }

    return {
      content: { type: 'text', text },
      model: model.id
    };
  };
}

function createVSCodeElicitationHandler(): ElicitationHandler {
  return async (request: Parameters<ElicitationHandler>[0]) => {
    const selection = await vscode.window.showWarningMessage(
      request.message,
      { modal: true },
      'Run',
      'Do not run',
      'Cancel'
    );

    if (!selection || selection === 'Cancel') {
      return { action: 'cancel' };
    }

    const confirmed = selection === 'Run';
    const reason = await vscode.window.showInputBox({
      prompt: confirmed
        ? 'Why do you need to run this command? (optional)'
        : 'Why are you declining this command? (optional)'
    });

    return {
      action: 'accept',
      content: {
        confirmed,
        reason: reason ?? ''
      }
    };
  };
}

async function getRuntime(workspaceCwd: string | undefined): Promise<ShellToolRuntime> {
  const runtimeKey = workspaceCwd ?? FALLBACK_WORKSPACE_KEY;
  const existingRuntime = runtimePromises.get(runtimeKey);
  if (existingRuntime) {
    return existingRuntime;
  }

  const runtimePromise = (async () => {
    configureShellServerEnvironment(workspaceCwd);

    const runtime = createShellToolRuntime({
      defaultWorkingDirectory: workspaceCwd,
        createMessage: createVSCodeMessageCallback(),
        elicitationHandler: createVSCodeElicitationHandler()
    });

    if (workspaceCwd) {
      runtime.processManager.setDefaultWorkingDirectory(workspaceCwd);
    }

    return runtime;
  })();

  runtimePromises.set(runtimeKey, runtimePromise);

  return runtimePromise;
}

class DirectShellTool implements vscode.LanguageModelTool<ToolParams> {
  constructor(
    private toolName: ToolName,
    private output: vscode.OutputChannel
  ) {}

  async prepareInvocation(
    options: vscode.LanguageModelToolInvocationPrepareOptions<ToolParams>
  ): Promise<vscode.PreparedToolInvocation> {
    const message = buildConfirmationMessage(this.toolName, options.input);

    return {
      invocationMessage: `Executing ${this.toolName} via Safe Shell Runner`,
      confirmationMessages: {
        title: `Safe Shell Runner: ${this.toolName}`,
        message
      }
    };
  }

  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<ToolParams>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const workspaceFolder = getConfiguredWorkspaceFolder(this.output);
    const hasMultipleFolders = (vscode.workspace.workspaceFolders?.length ?? 0) > 1;

    if (!workspaceFolder && hasMultipleFolders) {
      throw new Error(
        'Multiple workspace folders detected. Set safeShellRunner.workspaceFolder to the target folder name or path.'
      );
    }

    const workspaceCwd = workspaceFolder ? resolveConfiguredWorkingDirectory(workspaceFolder) : undefined;
    const runtime = await getRuntime(workspaceCwd);

    if (workspaceCwd) {
      this.output.appendLine(`Using workspace runtime: ${workspaceCwd}`);
    } else {
      this.output.appendLine('No workspace folder was resolved; using fallback runtime.');
    }

    const result = await dispatchToolCall(
      runtime.shellTools,
      runtime.serverManager,
      this.toolName,
      options.input,
      {
        defaultWorkingDirectory: workspaceCwd,
        fallbackWorkingDirectory: process.cwd(),
      }
    );

    return new vscode.LanguageModelToolResult([
      new vscode.LanguageModelTextPart(JSON.stringify(result))
    ]);
  }
}

function buildConfirmationMessage(toolName: ToolName, input?: ToolParams): vscode.MarkdownString {
  if (!input) {
    return new vscode.MarkdownString('Run Safe Shell Runner tool?');
  }

  if (toolName === 'shell_execute') {
    const command = typeof input.command === 'string' ? input.command.trim() : '';
    return command
      ? new vscode.MarkdownString(`Run the following command?\n\n\`\`\`\n${command}\n\`\`\``)
      : new vscode.MarkdownString('Run a shell command?');
  }

  if (toolName === 'terminal_operate') {
    const command = typeof input.command === 'string' ? input.command.trim() : '';
    const text = command ? `Terminal command: ${command}` : 'Operate a terminal session?';
    return new vscode.MarkdownString(text);
  }

  if (toolName === 'delete_execution_outputs') {
    return new vscode.MarkdownString('Delete execution output files?');
  }

  if (toolName === 'perform_auto_cleanup') {
    return new vscode.MarkdownString('Perform automatic cleanup of execution outputs?');
  }

  return new vscode.MarkdownString(`Run ${toolName}?`);
}

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel(SERVER_LABEL);
  output.appendLine('Registering Safe Shell Runner language model tools.');
  const toolRegistrations = ENABLED_TOOL_NAMES.map((toolName) =>
    vscode.lm.registerTool(toolName, new DirectShellTool(toolName, output))
  );

  context.subscriptions.push(output, ...toolRegistrations);
}

export async function deactivate() {
  for (const runtimePromise of runtimePromises.values()) {
    try {
      const runtime = await runtimePromise;
      await runtime.cleanup();
    } catch (error) {
      // Avoid throwing on shutdown.
    }
  }

  runtimePromises.clear();
}
