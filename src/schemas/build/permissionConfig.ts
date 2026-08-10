/*
 * Copyright (c) 2026, Clay Chipps; Copyright (c) 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from 'zod';

const ObjectPermissionConfigSchema = z.object({
  read: z.boolean().optional(),
  create: z.boolean().optional(),
  edit: z.boolean().optional(),
  delete: z.boolean().optional(),
  modifyAll: z.boolean().optional(),
  viewAll: z.boolean().optional(),
  viewAllFields: z.boolean().optional(),
});

const FieldPermissionConfigSchema = z.object({
  readable: z.boolean().optional(),
  editable: z.boolean().optional(),
});

const TabPermissionConfigSchema = z.object({
  visible: z.boolean().optional(),
});

const RecordTypeVisibilityConfigSchema = z.object({
  visible: z.boolean().optional(),
});

export const PermissionSetBuildConfigSchema = z.object({
  objects: z.record(z.string(), ObjectPermissionConfigSchema).optional(),
  fields: z.record(z.string(), FieldPermissionConfigSchema).optional(),
  tabs: z.record(z.string(), TabPermissionConfigSchema).optional(),
  recordTypeVisibilities: z.record(z.string(), RecordTypeVisibilityConfigSchema).optional(),
  userPermissions: z.record(z.string(), z.boolean()).optional(),
});

export type PermissionSetBuildConfig = z.infer<typeof PermissionSetBuildConfigSchema>;
