import type { ThemeMode } from "../../domain/entities/Theme";
import type { ViewerPort } from "../../domain/ports/ViewerPort";

export class SetThemeUseCase {
  constructor(private readonly viewer: ViewerPort) {}

  execute(mode: ThemeMode): void {
    this.viewer.setTheme(mode);
  }
}
