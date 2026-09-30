@sealed()
type BootstrapRuntime = {
  mode: 'bootstrap'
}

@sealed()
type HostedRuntime = {
  mode: 'workshop'
  @minLength(1)
  apiImage: string
  @minLength(1)
  dashboardImage: string
  @minLength(36)
  @maxLength(36)
  entraTenantId: string
  @minLength(36)
  @maxLength(36)
  entraApiClientId: string
  @minLength(36)
  @maxLength(36)
  entraSpaClientId: string
  @minLength(1)
  dashboardOrigin: string
  @minLength(1)
  unitSigningSecretName: string
  @minLength(32)
  @maxLength(32)
  unitSigningSecretVersion: string
  @minLength(1)
  campaignRuntimeBlobUrl: string
  @minLength(64)
  @maxLength(64)
  campaignRuntimeSha256: string
}

@export()
@discriminator('mode')
type WorkshopRuntime = BootstrapRuntime | HostedRuntime
