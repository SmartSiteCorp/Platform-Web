import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from "class-validator";

export const maxPhaseWorkerAssignmentsPerRequest = 50;

export class AssignPhaseWorkersRequestDto {
  @ApiProperty({
    example: ["7a6f5c24-1f54-48f4-95f8-25d13e68fb86"],
    isArray: true,
    maxItems: maxPhaseWorkerAssignmentsPerRequest,
    minItems: 1,
    type: String,
  })
  @IsArray({ message: "La liste des ouvriers est obligatoire." })
  @ArrayNotEmpty({ message: "Au moins un ouvrier doit être sélectionné." })
  @ArrayMaxSize(maxPhaseWorkerAssignmentsPerRequest, {
    message: "Trop d'ouvriers sont sélectionnés pour une seule assignation.",
  })
  @ArrayUnique({ message: "Chaque ouvrier ne peut être sélectionné qu'une seule fois." })
  @IsUUID("4", { each: true, message: "Chaque ouvrier doit être identifié par un UUID valide." })
  public readonly workerUserIds!: readonly string[];
}

export class AssignableWorkerResponseDto {
  @ApiProperty({ example: "7a6f5c24-1f54-48f4-95f8-25d13e68fb86", type: String })
  public readonly workerUserId!: string;

  @ApiProperty({ example: "Armand", type: String })
  public readonly firstName!: string;

  @ApiProperty({ example: "Braud", type: String })
  public readonly lastName!: string;
}

export class AssignableWorkersResponseDto {
  @ApiProperty({ example: "30eb69f8-82cd-4b04-8d88-8a2f64b8d6d8", type: String })
  public readonly siteId!: string;

  @ApiProperty({ isArray: true, type: AssignableWorkerResponseDto })
  public readonly workers!: readonly AssignableWorkerResponseDto[];
}

export class PhaseWorkerAssignmentResponseDto {
  @ApiProperty({ example: "30eb69f8-82cd-4b04-8d88-8a2f64b8d6d8", type: String })
  public readonly siteId!: string;

  @ApiProperty({ example: "d59c5e1a-6473-4835-98f6-40c5d6e47f81", type: String })
  public readonly phaseId!: string;

  @ApiProperty({ example: "7a6f5c24-1f54-48f4-95f8-25d13e68fb86", type: String })
  public readonly workerUserId!: string;

  @ApiProperty({ example: "Armand", type: String })
  public readonly workerFirstName!: string;

  @ApiProperty({ example: "Braud", type: String })
  public readonly workerLastName!: string;

  @ApiProperty({ example: "2026-07-02T10:00:00.000Z", type: String })
  public readonly assignedAt!: string;
}

export class PhaseWorkerAssignmentsResponseDto {
  @ApiProperty({ example: "30eb69f8-82cd-4b04-8d88-8a2f64b8d6d8", type: String })
  public readonly siteId!: string;

  @ApiProperty({ example: "d59c5e1a-6473-4835-98f6-40c5d6e47f81", type: String })
  public readonly phaseId!: string;

  @ApiProperty({ isArray: true, type: PhaseWorkerAssignmentResponseDto })
  public readonly assignments!: readonly PhaseWorkerAssignmentResponseDto[];
}

export class WorkerAssignedTaskResponseDto {
  @ApiProperty({ example: "f47ac10b-58cc-4372-a567-0e02b2c3d479", type: String })
  public readonly id!: string;

  @ApiProperty({ example: "30eb69f8-82cd-4b04-8d88-8a2f64b8d6d8", type: String })
  public readonly siteId!: string;

  @ApiProperty({ example: "d59c5e1a-6473-4835-98f6-40c5d6e47f81", type: String })
  public readonly phaseId!: string;

  @ApiProperty({ example: "Gros œuvre", type: String })
  public readonly phaseName!: string;

  @ApiProperty({ example: "Préparer les fondations", type: String })
  public readonly title!: string;

  @ApiPropertyOptional({ example: "Implantation et coffrage", nullable: true, type: String })
  public readonly description!: string | null;

  @ApiProperty({ example: "todo", type: String })
  public readonly status!: string;

  @ApiPropertyOptional({ example: "2026-07-10", nullable: true, type: String })
  public readonly dueDate!: string | null;
}

export class WorkerAssignedTasksResponseDto {
  @ApiProperty({ example: "30eb69f8-82cd-4b04-8d88-8a2f64b8d6d8", type: String })
  public readonly siteId!: string;

  @ApiProperty({ example: "7a6f5c24-1f54-48f4-95f8-25d13e68fb86", type: String })
  public readonly workerUserId!: string;

  @ApiProperty({ isArray: true, type: WorkerAssignedTaskResponseDto })
  public readonly tasks!: readonly WorkerAssignedTaskResponseDto[];
}
