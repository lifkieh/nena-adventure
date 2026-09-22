import type { UserDto, UserRole } from "@nena/shared";
import type { User } from "../db/schema.js";

/** Map row User -> DTO aman untuk dikirim (tanpa passwordHash). */
export function toUserDto(u: User): UserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as UserRole,
    active: u.active,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}
